import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Between, DataSource, EntityManager } from 'typeorm';
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
        const rounds = ['1', '2', '3', '32', '16', '8', '4', '2'];
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
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
  private async enterpriseUpsert(
    manager: EntityManager,
    matchDto: ExternalMatchDto,
  ): Promise<void> {
    const matchRepository = manager.getRepository(MatchEntity);
    let existing = await matchRepository.findOne({
      where: { externalApiId: matchDto.externalApiId },
    });
    if (!existing && matchDto.externalApiId) {
      const matchDate = new Date(matchDto.dateTime);
      const startOfDay = new Date(matchDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(matchDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      existing = await matchRepository.findOne({
        where: {
          homeTeam: matchDto.homeTeam,
          awayTeam: matchDto.awayTeam,
          dateTime: Between(startOfDay, endOfDay),
        },
      });
      if (existing) {
        existing.externalApiId = matchDto.externalApiId;
        this.logger.log(
          `Partido manual detectado. Vinculando ID de API ${matchDto.externalApiId} al partido ID ${existing.id}`,
        );
      }
    }
    const status = this.calculateMatchStatus(matchDto.dateTime);
    if (existing) {
      let needsSave = false;
      if (existing.phase !== matchDto.phase) {
        existing.phase = matchDto.phase;
        needsSave = true;
      }
      if (existing.homeTeam !== matchDto.homeTeam) {
        existing.homeTeam = matchDto.homeTeam;
        needsSave = true;
      }
      if (existing.awayTeam !== matchDto.awayTeam) {
        existing.awayTeam = matchDto.awayTeam;
        needsSave = true;
      }
      if (existing.stadium !== matchDto.stadium) {
        existing.stadium = matchDto.stadium;
        needsSave = true;
      }
      if (existing.city !== matchDto.city) {
        existing.city = matchDto.city;
        needsSave = true;
      }
      if (existing.homeTeamBadge !== matchDto.homeTeamBadge) {
        existing.homeTeamBadge = matchDto.homeTeamBadge;
        needsSave = true;
      }
      if (existing.awayTeamBadge !== matchDto.awayTeamBadge) {
        existing.awayTeamBadge = matchDto.awayTeamBadge;
        needsSave = true;
      }
      if (existing.externalApiId !== matchDto.externalApiId) {
        existing.externalApiId = matchDto.externalApiId;
        needsSave = true;
      }
      if (existing.stadiumImage !== matchDto.stadiumImage) {
        existing.stadiumImage = matchDto.stadiumImage;
        needsSave = true;
      }
      if (existing.status === MatchStatus.FINISHED) {
        if (needsSave) {
          await matchRepository.save(existing);
        }
        this.logger.warn(
          `Partido ${existing.id} (ext: ${matchDto.externalApiId}) ya está FINISHED — omitiendo mutación de marcador/estado`,
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
        stadiumImage: matchDto.stadiumImage,
        homeTeamBadge: matchDto.homeTeamBadge,
        awayTeamBadge: matchDto.awayTeamBadge,
        status,
      });
      await matchRepository.save(newMatch);
    }
  }
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
