import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
interface PostgresDriverError extends Error {
  readonly code?: string;
  readonly detail?: string;
  readonly constraint?: string;
}
interface DatabaseErrorResponse {
  readonly statusCode: number;
  readonly message: string;
  readonly timestamp: string;
  readonly path: string;
}
const PG_UNIQUE_VIOLATION = '23505' as const;
const PG_RAISE_EXCEPTION = '45000' as const;
@Catch(QueryFailedError)
export class PostgresExceptionFilter implements ExceptionFilter<QueryFailedError> {
  private readonly logger = new Logger(PostgresExceptionFilter.name);
  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
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
  private resolveHttpError(
    driverError: PostgresDriverError,
    exception: QueryFailedError,
  ): {
    statusCode: number;
    message: string;
  } {
    switch (driverError.code) {
      case PG_UNIQUE_VIOLATION:
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'El registro con ese identificador ya existe en el sistema',
        };
      case PG_RAISE_EXCEPTION:
        return {
          statusCode: HttpStatus.FORBIDDEN,
          message:
            'Operación rechazada por regla de negocio (Time-Lock activo: el partido ya ha comenzado)',
        };
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
