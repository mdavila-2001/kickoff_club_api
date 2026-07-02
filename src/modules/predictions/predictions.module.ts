import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';
import { PredictionEntity } from './entities/prediction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PredictionEntity])],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [TypeOrmModule],
})
export class PredictionsModule {}
