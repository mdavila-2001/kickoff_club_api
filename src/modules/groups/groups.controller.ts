import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.create(createGroupDto, req.user.id);
  }

  @Post('join/:inviteCode')
  joinGroup(
    @Param('inviteCode') inviteCode: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.joinGroup(inviteCode, req.user.id);
  }

  @Get('me')
  findMyGroups(@Req() req: AuthenticatedRequest) {
    return this.groupsService.findMyGroups(req.user.id);
  }

  @Get(':id/participants')
  findParticipants(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.findParticipants(id);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.getLeaderboard(id);
  }
}
