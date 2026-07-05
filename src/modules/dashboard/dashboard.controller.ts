import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.dashboardService.getSummary(req.user.id);
  }
}
