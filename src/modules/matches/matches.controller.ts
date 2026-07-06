import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { MatchesService } from './matches.service';
import { IngestionService } from './services/ingestion.service';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { SyncSeasonDto } from './dto/sync-season.dto';
import { SyncDayDto } from './dto/sync-day.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-user.interface';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly ingestionService: IngestionService,
  ) {}

  @Get()
  findAll(@Query() filters: FilterMatchesDto) {
    return this.matchesService.findAll(filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.matchesService.findDetail(id, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.createMatch(createMatchDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMatchDto: UpdateMatchDto,
  ) {
    return this.matchesService.updateMatch(id, updateMatchDto);
  }

  @Post('sync/force')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async forceSync(): Promise<{
    success: boolean;
    message: string;
    synchronized: number;
  }> {
    const result = await this.ingestionService.syncMatches();
    return {
      success: true,
      message: 'Sincronización forzada completada con éxito',
      synchronized: result.synchronized,
    };
  }

  @Post('sync/season')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncSeason(@Body() dto: SyncSeasonDto): Promise<{
    success: boolean;
    message: string;
    synchronized: number;
  }> {
    const result = await this.ingestionService.syncMatchesBySeason(
      dto.leagueId,
      dto.season,
    );
    return {
      success: true,
      message: `Sincronización de temporada ${dto.season} de la liga ${dto.leagueId} completada con éxito`,
      synchronized: result.synchronized,
    };
  }

  @Post('sync/day')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncDay(@Body() dto: SyncDayDto): Promise<{
    success: boolean;
    message: string;
    synchronized: number;
  }> {
    const targetDate = dto.date || new Date().toISOString().split('T')[0];
    const result = await this.ingestionService.syncMatchesByDay(
      targetDate,
      dto.leagueId,
    );

    return {
      success: true,
      message: `Sincronización diaria para la fecha ${targetDate} completada con éxito`,
      synchronized: result.synchronized,
    };
  }
}
