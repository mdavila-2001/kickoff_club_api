import { Injectable } from '@nestjs/common';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@Injectable()
export class PredictionsService {
  async create(createPredictionDto: CreatePredictionDto) {
    // TODO: Implement create prediction logic
  }

  async update(id: string, updatePredictionDto: UpdatePredictionDto) {
    // TODO: Implement update prediction logic
  }

  async findAll() {
    // TODO: Implement find all predictions logic
  }
}
