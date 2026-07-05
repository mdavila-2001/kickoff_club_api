import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { IngestionService } from './services/ingestion.service';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findById(id);
  }

  /**
   * Forzar manualmente la sincronización de partidos desde el proveedor externo.
   * Endpoint de acceso exclusivo para administradores (RBAC).
   */
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
}
