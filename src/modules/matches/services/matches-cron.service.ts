import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IngestionService } from './ingestion.service';
@Injectable()
export class MatchesCronService {
  private readonly logger = new Logger(MatchesCronService.name);
  private isSyncing = false;
  private static readonly WORLD_CUP_LEAGUE_ID = '4429';
  private static readonly WORLD_CUP_SEASON = '2026';
  constructor(private readonly ingestionService: IngestionService) {}
  @Cron('0 */20 * * * *')
  public async handleMatchesSync(): Promise<void> {
    if (this.isSyncing) {
      this.logger.warn('Sincronización previa aún en proceso, omitiendo pulso');
      return;
    }
    this.isSyncing = true;
    this.logger.log(
      `Iniciando sincronización automática del Mundial 2026 (liga ${MatchesCronService.WORLD_CUP_LEAGUE_ID}, temporada ${MatchesCronService.WORLD_CUP_SEASON})`,
    );
    try {
      const result = await this.ingestionService.syncMatchesBySeason(
        MatchesCronService.WORLD_CUP_LEAGUE_ID,
        MatchesCronService.WORLD_CUP_SEASON,
      );
      this.logger.log(
        `Sincronización automática completada con éxito. Partidos sincronizados: ${result.synchronized}`,
      );
    } catch (error) {
      this.logger.error(
        'Fallo en la sincronización automática de partidos del Mundial 2026',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isSyncing = false;
    }
  }
}
