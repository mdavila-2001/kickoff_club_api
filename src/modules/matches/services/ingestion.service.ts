import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { ISportsProvider } from '../../sports-client/interfaces/sports-provider.interface';
import { ExternalMatchDto } from '../../sports-client/dto/external-match.dto';
import { MatchEntity } from '../entities/match.entity';
import { MatchStatus } from '../enums/match-status.enum';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @Inject('SPORTS_PROVIDER_TOKEN')
    private readonly sportsProvider: ISportsProvider,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Orquesta la llamada al proveedor de deportes, inicia la transacción,
   * procesa el lote de partidos de forma idempotente y asegura el commit/rollback.
   */
  public async syncMatches(): Promise<{
    synchronized: number;
    status: string;
  }> {
    const externalMatches = await this.fetchExternalMatches();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let synchronizedCount = 0;

      for (const matchDto of externalMatches) {
        await this.enterpriseUpsert(queryRunner.manager, matchDto);
        synchronizedCount++;
      }

      await queryRunner.commitTransaction();

      return {
        synchronized: synchronizedCount,
        status: 'success',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Failed to synchronize matches. Transaction rolled back.',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error interno al persistir la sincronización de partidos',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Maneja la bifurcación idempotente (INSERT/UPDATE) basada en externalApiId
   * utilizando el EntityManager de la transacción activa.
   */
  private async enterpriseUpsert(
    manager: EntityManager,
    matchDto: ExternalMatchDto,
  ): Promise<void> {
    const matchRepository = manager.getRepository(MatchEntity);

    const existing = await matchRepository.findOne({
      where: { externalApiId: matchDto.externalApiId },
    });

    const status = this.calculateMatchStatus(matchDto.dateTime);

    if (existing) {
      if (existing.status === MatchStatus.FINISHED) {
        this.logger.warn(
          `Partido ${existing.id} (ext: ${matchDto.externalApiId}) ya está FINISHED — omitiendo mutación`,
        );
        return;
      }

      existing.homeScore = matchDto.homeScore;
      existing.awayScore = matchDto.awayScore;
      existing.status = status;
      existing.dateTime = matchDto.dateTime;
      await matchRepository.save(existing);
    } else {
      const newMatch = matchRepository.create({
        externalApiId: matchDto.externalApiId,
        homeTeam: matchDto.homeTeam,
        awayTeam: matchDto.awayTeam,
        homeScore: matchDto.homeScore,
        awayScore: matchDto.awayScore,
        dateTime: matchDto.dateTime,
        phase: matchDto.phase,
        stadium: matchDto.stadium,
        city: matchDto.city,
        status,
      });
      await matchRepository.save(newMatch);
    }
  }

  /**
   * Infiere el estado del partido basándose en la diferencia de minutos con el tiempo actual.
   */
  private calculateMatchStatus(matchDateTime: Date): MatchStatus {
    const now = new Date();
    const diffMinutes = (now.getTime() - matchDateTime.getTime()) / (1000 * 60);

    if (diffMinutes >= 120) {
      return MatchStatus.FINISHED;
    } else if (diffMinutes >= 0 && diffMinutes < 120) {
      return MatchStatus.ONGOING;
    }
    return MatchStatus.PENDING;
  }

  /**
   * Encapsula la obtención de partidos y maneja de forma segura las excepciones de la API externa.
   */
  private async fetchExternalMatches(): Promise<ExternalMatchDto[]> {
    try {
      return await this.sportsProvider.fetchLiveMatches();
    } catch (error) {
      this.logger.error(
        'Failed to fetch matches from sports provider API',
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }
  }
}
