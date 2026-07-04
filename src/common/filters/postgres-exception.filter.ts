import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

// ---------------------------------------------------------------------------
// Tipos privados — SRP: este módulo sólo conoce el driver `pg`
// ---------------------------------------------------------------------------

/**
 * Forma del objeto de error nativo emitido por el driver `pg`.
 * `code` contiene el SQLSTATE de PostgreSQL (e.g. '23505', '45000').
 */
interface PostgresDriverError extends Error {
  readonly code?: string;
  readonly detail?: string;
  readonly constraint?: string;
}

/**
 * Contrato simétrico de respuesta de error entregado al cliente.
 * Nunca expone detalles internos de la infraestructura.
 */
interface DatabaseErrorResponse {
  readonly statusCode: number;
  readonly message: string;
  readonly timestamp: string;
  readonly path: string;
}

// ---------------------------------------------------------------------------
// SQLSTATE codes relevantes para el dominio de KickOff Club
// ---------------------------------------------------------------------------
const PG_UNIQUE_VIOLATION = '23505' as const;
const PG_RAISE_EXCEPTION = '45000' as const;

// ---------------------------------------------------------------------------
// Filtro global
// ---------------------------------------------------------------------------

/**
 * Filtro perimetral que intercepta únicamente errores de tipo {@link QueryFailedError}
 * lanzados por TypeORM/PostgreSQL y los traduce a respuestas HTTP estructuradas.
 *
 * Responsabilidad exclusiva: traducir SQLSTATE de motor a semántica HTTP.
 * No contiene lógica de negocio, mapeos de usuarios ni firmas de tokens.
 */
@Catch(QueryFailedError)
export class PostgresExceptionFilter implements ExceptionFilter<QueryFailedError> {
  private readonly logger = new Logger(PostgresExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extrae el error nativo del driver pg con tipado fuerte (sin 'any')
    const driverError = exception.driverError as PostgresDriverError;

    const { statusCode, message } = this.resolveHttpError(
      driverError,
      exception,
    );

    const body: DatabaseErrorResponse = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  // --------------------------------------------------------------------------
  // Métodos privados
  // --------------------------------------------------------------------------

  /**
   * Evalúa el SQLSTATE del error y devuelve el código HTTP y mensaje adecuados.
   * Cualquier código no reconocido se mapea a 500 y registra el stack completo
   * para auditoría interna sin exponerlo al cliente.
   */
  private resolveHttpError(
    driverError: PostgresDriverError,
    exception: QueryFailedError,
  ): { statusCode: number; message: string } {
    switch (driverError.code) {
      // SQLSTATE 23505: unique_violation
      case PG_UNIQUE_VIOLATION:
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'El registro con ese identificador ya existe en el sistema',
        };

      // SQLSTATE 45000: excepción personalizada de PL/pgSQL (Time-Lock de apuestas)
      case PG_RAISE_EXCEPTION:
        return {
          statusCode: HttpStatus.FORBIDDEN,
          message:
            'Operación rechazada por regla de negocio (Time-Lock activo: el partido ya ha comenzado)',
        };

      // Cualquier otro error relacional: 500 + log interno con stack trace
      default:
        this.logger.error(
          `[${new Date().toISOString()}] Unhandled DB error — SQLSTATE: ${driverError.code ?? 'UNKNOWN'}`,
          exception.stack,
          PostgresExceptionFilter.name,
        );
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor',
        };
    }
  }
}
