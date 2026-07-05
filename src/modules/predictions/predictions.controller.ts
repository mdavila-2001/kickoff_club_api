import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post()
  create(
    @Body() createPredictionDto: CreatePredictionDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.predictionsService.createOrUpdatePrediction(
      req.user.id,
      createPredictionDto,
    );
  }

  @Get('me')
  findMyPredictions(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.predictionsService.findUserPredictions(req.user.id);
  }
}
