import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { FilterMatchesDto } from './dto/filter-matches.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  findAll(@Query() filters: FilterMatchesDto) {
    return this.matchesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findById(id);
  }
}
