import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-user.interface';
@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}
  @Post()
  create(
    @Body()
    createPredictionDto: CreatePredictionDto,
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.predictionsService.createOrUpdatePrediction(
      req.user.id,
      createPredictionDto,
    );
  }
  @Get('me')
  findMyPredictions(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.predictionsService.findUserPredictions(req.user.id);
  }
}
