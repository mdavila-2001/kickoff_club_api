import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-user.interface';
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('me')
  getMyProfile(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.usersService.getProfile(req.user.id);
  }
  @Patch('me')
  updateMyProfile(
    @Req()
    req: AuthenticatedRequest,
    @Body()
    updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }
}
