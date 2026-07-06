import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePredictionDto } from './dto/create-prediction.dto';
import { PredictionEntity } from './entities/prediction.entity';

@Injectable()
export class PredictionsService {
  constructor(
    @InjectRepository(PredictionEntity)
    private readonly predictionsRepository: Repository<PredictionEntity>,
  ) {}

  async createOrUpdatePrediction(
    userId: string,
    dto: CreatePredictionDto,
  ): Promise<PredictionEntity> {
    const existing = await this.predictionsRepository.findOne({
      where: { userId, matchId: dto.matchId },
    });

    if (existing) {
      existing.predictedHome = dto.predictedHome;
      existing.predictedAway = dto.predictedAway;
      return this.predictionsRepository.save(existing);
    }

    const prediction = this.predictionsRepository.create({
      userId,
      matchId: dto.matchId,
      predictedHome: dto.predictedHome,
      predictedAway: dto.predictedAway,
    });

    return this.predictionsRepository.save(prediction);
  }

  async findUserPredictions(userId: string): Promise<PredictionEntity[]> {
    return this.predictionsRepository.find({
      where: { userId },
      relations: { match: true },
    });
  }
}
