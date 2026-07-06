import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';

import { MatchEntity } from './entities/match.entity';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchStatus } from './enums/match-status.enum';
import { PredictionEntity } from '../predictions/entities/prediction.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchRepository: Repository<MatchEntity>,
  ) {}

  async findAll(filters: FilterMatchesDto): Promise<MatchEntity[]> {
    const where: FindOptionsWhere<MatchEntity> = {};

    if (filters.phase) {
      where.phase = filters.phase;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date) {
      const dayStart = new Date(`${filters.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${filters.date}T23:59:59.999Z`);
      where.dateTime = Between(dayStart, dayEnd);
    }

    return this.matchRepository.find({
      where,
      order: { dateTime: 'ASC' },
    });
  }

  async findById(id: string): Promise<MatchEntity> {
    const match = await this.matchRepository.findOne({ where: { id } });

    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }

    return match;
  }

  async createMatch(dto: CreateMatchDto): Promise<MatchEntity> {
    const match = this.matchRepository.create({
      homeTeam: dto.homeTeam,
      awayTeam: dto.awayTeam,
      dateTime: new Date(dto.dateTime),
      phase: dto.phase,
      stadium: dto.stadium,
      city: dto.city,
    });

    return this.matchRepository.save(match);
  }

  async updateMatch(id: string, dto: UpdateMatchDto): Promise<MatchEntity> {
    const match = await this.findById(id);

    const updates: Partial<
      Pick<
        MatchEntity,
        | 'dateTime'
        | 'phase'
        | 'stadium'
        | 'city'
        | 'status'
        | 'homeScore'
        | 'awayScore'
      >
    > = {};

    if (dto.dateTime !== undefined) {
      updates.dateTime = new Date(dto.dateTime);
    }
    if (dto.phase !== undefined) {
      updates.phase = dto.phase;
    }
    if (dto.stadium !== undefined) {
      updates.stadium = dto.stadium;
    }
    if (dto.city !== undefined) {
      updates.city = dto.city;
    }
    if (dto.status !== undefined) {
      updates.status = dto.status;
    }
    if (dto.homeScore !== undefined) {
      updates.homeScore = dto.homeScore;
    }
    if (dto.awayScore !== undefined) {
      updates.awayScore = dto.awayScore;
    }

    Object.assign(match, updates);

    return this.matchRepository.save(match);
  }

  async findDetail(id: string, currentUserId: string): Promise<any> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: { predictions: { user: true } },
    });

    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }

    const predictions = match.predictions ?? [];

    // Calculate aggregate prediction stats
    const total = predictions.length;
    let homeWinCount = 0;
    let awayWinCount = 0;
    let drawCount = 0;

    predictions.forEach((p) => {
      if (p.predictedHome > p.predictedAway) {
        homeWinCount++;
      } else if (p.predictedHome < p.predictedAway) {
        awayWinCount++;
      } else {
        drawCount++;
      }
    });

    const homeWinPct = total > 0 ? Math.round((homeWinCount / total) * 100) : 0;
    const awayWinPct = total > 0 ? Math.round((awayWinCount / total) * 100) : 0;
    const drawPct = total > 0 ? Math.round((drawCount / total) * 100) : 0;

    // Filter predictions to protect scores for pending matches
    let resultPredictions = [];
    if (match.status === MatchStatus.PENDING) {
      // Only return the current user's prediction to prevent cheating
      resultPredictions = predictions
        .filter((p) => p.userId === currentUserId)
        .map((p) => ({
          id: p.id,
          userId: p.userId,
          matchId: p.matchId,
          predictedHome: p.predictedHome,
          predictedAway: p.predictedAway,
          pointsEarned: p.pointsEarned,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          user: {
            id: p.user?.id,
            username: p.user?.username,
          },
        }));
    } else {
      // Return all predictions for ongoing/finished matches
      resultPredictions = predictions.map((p) => ({
        id: p.id,
        userId: p.userId,
        matchId: p.matchId,
        predictedHome: p.predictedHome,
        predictedAway: p.predictedAway,
        pointsEarned: p.pointsEarned,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        user: {
          id: p.user?.id,
          username: p.user?.username,
        },
      }));
    }

    return {
      id: match.id,
      externalApiId: match.externalApiId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      dateTime: match.dateTime,
      phase: match.phase,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      stadium: match.stadium,
      city: match.city,
      homeTeamBadge: match.homeTeamBadge,
      awayTeamBadge: match.awayTeamBadge,
      stadiumImage: match.stadiumImage,
      predictions: resultPredictions,
      stats: {
        total,
        homeWinCount,
        awayWinCount,
        drawCount,
        homeWinPct,
        awayWinPct,
        drawPct,
      },
    };
  }
}
