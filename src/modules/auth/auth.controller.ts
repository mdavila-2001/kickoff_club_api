import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthUserProfile,
  AuthResponse,
} from './interfaces/auth-response.interface';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  register(
    @Body()
    registerUserDto: RegisterUserDto,
  ): Promise<AuthUserProfile> {
    return this.authService.register(registerUserDto);
  }
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body()
    loginDto: LoginDto,
  ): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(): {
    message: string;
  } {
    return { message: 'Sesión cerrada exitosamente.' };
  }
}
