import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GroupParticipantEntity } from '../groups/entities/group-participant.entity';
import { MatchEntity } from '../matches/entities/match.entity';
import { PredictionEntity } from '../predictions/entities/prediction.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import {
  DashboardSummary,
  GroupRanking,
} from './interfaces/dashboard-summary.interface';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(GroupParticipantEntity)
    private readonly participantsRepository: Repository<GroupParticipantEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchesRepository: Repository<MatchEntity>,
    @InjectRepository(PredictionEntity)
    private readonly predictionsRepository: Repository<PredictionEntity>,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const [participations, pendingMatchesCount, totalAccumulatedPoints, stats] =
      await Promise.all([
        this.participantsRepository.find({
          where: { userId },
          relations: { group: { participants: true } },
        }),
        this.countPendingUnpredictedMatches(userId),
        this.calculateTotalPoints(userId),
        this.predictionsRepository
          .createQueryBuilder('prediction')
          .select('COUNT(*)', 'total')
          .addSelect(
            'SUM(CASE WHEN prediction.points_earned = 3 THEN 1 ELSE 0 END)',
            'exact',
          )
          .addSelect(
            'SUM(CASE WHEN prediction.points_earned > 0 THEN 1 ELSE 0 END)',
            'hits',
          )
          .where('prediction.user_id = :userId', { userId })
          .andWhere('prediction.points_earned IS NOT NULL')
          .getRawOne<{ total: string; exact: string; hits: string }>(),
      ]);

    const total = parseInt(stats?.total ?? '0', 10);
    const exact = parseInt(stats?.exact ?? '0', 10);
    const hits = parseInt(stats?.hits ?? '0', 10);

    const exactPredictionsCount = exact;
    const efficiencyRate = total > 0 ? Math.round((hits / total) * 100) : 0;

    const groupsCount = participations.length;

    const groupRankings: GroupRanking[] = participations.map(
      (myParticipation) => {
        const sorted = [...myParticipation.group.participants].sort(
          (a, b) => b.accumulatedPoints - a.accumulatedPoints,
        );
        const maxPoints = sorted[0]?.accumulatedPoints ?? 0;
        const position =
          maxPoints > 0
            ? sorted.findIndex((p) => p.userId === userId) + 1
            : null;

        return {
          groupId: myParticipation.groupId,
          groupName: myParticipation.group.name,
          position,
          accumulatedPoints: myParticipation.accumulatedPoints,
          exactPredictionsCount,
          efficiencyRate,
          rankDelta: myParticipation.rankDelta ?? 0,
        };
      },
    );

    return {
      groupsCount,
      pendingMatchesCount,
      groupRankings,
      totalAccumulatedPoints,
    };
  }

  private async countPendingUnpredictedMatches(
    userId: string,
  ): Promise<number> {
    const pendingMatches = await this.matchesRepository.find({
      where: { status: MatchStatus.PENDING },
    });

    if (pendingMatches.length === 0) {
      return 0;
    }

    const predictedMatchIds = await this.predictionsRepository
      .find({ where: { userId }, select: { matchId: true } })
      .then((preds) => new Set(preds.map((p) => p.matchId)));

    return pendingMatches.filter((m) => !predictedMatchIds.has(m.id)).length;
  }

  private async calculateTotalPoints(userId: string): Promise<number> {
    const result = await this.predictionsRepository
      .createQueryBuilder('prediction')
      .select('COALESCE(SUM(prediction.points_earned), 0)', 'total')
      .where('prediction.user_id = :userId', { userId })
      .getRawOne<{ total: string }>();

    return parseInt(result?.total ?? '0', 10);
  }
}
