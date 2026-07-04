import { Injectable } from '@nestjs/common';
import { FilterMatchesDto } from './dto/filter-matches.dto';

@Injectable()
export class MatchesService {
  async findAll(filters: FilterMatchesDto) {
    // TODO: Implement find all matches logic with filters
  }

  async findById(id: string) {
    // TODO: Implement find by id logic
  }
}
