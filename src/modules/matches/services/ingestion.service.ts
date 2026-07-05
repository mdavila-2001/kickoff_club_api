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
   * Obtiene y sincroniza de forma transaccional e idempotente todos los partidos
   * de una liga y temporada específica.
   */
  public async syncMatchesBySeason(
    leagueId: string,
    season: string,
  ): Promise<{
    synchronized: number;
    status: string;
  }> {
    this.logger.log(
      `Starting synchronization for league ${leagueId} season ${season}...`,
    );
    let externalMatches: ExternalMatchDto[] = [];
    try {
      if (
        leagueId === '4429' &&
        (season === '2026' || season === '2025-2026')
      ) {
        const rounds = ['1', '2', '3', '32', '16'];
        const apiSeason = '2026';
        this.logger.log(
          `Fetching 2026 World Cup by rounds: ${rounds.join(', ')} (API Season: ${apiSeason})...`,
        );
        for (const round of rounds) {
          const roundMatches = await this.sportsProvider.fetchMatchesByRound(
            leagueId,
            round,
            apiSeason,
          );
          externalMatches.push(...roundMatches);
        }
      } else {
        externalMatches = await this.sportsProvider.fetchMatchesBySeason(
          leagueId,
          season,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch matches for league ${leagueId} season ${season} from sports provider API`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }

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
        `Failed to synchronize matches for season ${season}. Transaction rolled back.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error interno al persistir la sincronización de partidos de la temporada',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene y sincroniza de forma transaccional e idempotente todos los partidos
   * de un día específico.
   */
  public async syncMatchesByDay(
    date: string,
    leagueId?: string,
  ): Promise<{
    synchronized: number;
    status: string;
  }> {
    this.logger.log(
      `Starting daily synchronization for date ${date} (League: ${leagueId || 'Any'})...`,
    );
    let externalMatches: ExternalMatchDto[];
    try {
      externalMatches = await this.sportsProvider.fetchMatchesByDay(
        date,
        leagueId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch matches for date ${date} from sports provider API`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }

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
        `Failed to synchronize matches for date ${date}. Transaction rolled back.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error interno al persistir la sincronización de partidos del día',
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
      existing.homeTeamBadge = matchDto.homeTeamBadge;
      existing.awayTeamBadge = matchDto.awayTeamBadge;
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
        homeTeamBadge: matchDto.homeTeamBadge,
        awayTeamBadge: matchDto.awayTeamBadge,
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
