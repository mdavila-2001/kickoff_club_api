import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IngestionService } from './ingestion.service';

@Injectable()
export class MatchesCronService {
  private readonly logger = new Logger(MatchesCronService.name);
  private isSyncing = false;

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Sincronización automática de partidos desde el proveedor externo.
   * Se ejecuta cada 30 minutos y previene el solapamiento bajo carga.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  public async handleMatchesSync(): Promise<void> {
    if (this.isSyncing) {
      this.logger.warn('Sincronización previa aún en proceso, omitiendo pulso');
      return;
    }

    this.isSyncing = true;
    this.logger.log(
      'Iniciando sincronización automática de partidos desde el proveedor externo',
    );

    try {
      const result = await this.ingestionService.syncMatches();
      this.logger.log(
        `Sincronización automática completada con éxito. Partidos procesados: ${result.synchronized}`,
      );
    } catch (error) {
      this.logger.error(
        'Fallo en la sincronización automática de partidos',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isSyncing = false;
    }
  }
}
