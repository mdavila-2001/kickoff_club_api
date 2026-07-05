import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { GroupParticipantEntity } from '../groups/entities/group-participant.entity';
import { MatchEntity } from '../matches/entities/match.entity';
import { PredictionEntity } from '../predictions/entities/prediction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupParticipantEntity,
      MatchEntity,
      PredictionEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
