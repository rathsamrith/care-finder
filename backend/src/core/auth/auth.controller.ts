import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { minutes, perIp, perIpAndEmail } from '../../common/throttle';
import { AuthService } from './auth.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser, JwtPayload } from './strategies/jwt-access.strategy';

// Endpoint shape mirrors Laravel's routes/api.php `v1` group + AuthController
// 1:1 (see MIGRATION_ROADMAP.md for the full route mapping table). The one
// addition is POST /v1/refresh-token, required because JWTs expire and
// Sanctum's opaque tokens didn't.
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly fileStorage: FileStorageService,
  ) {}

  // Sensitive routes get tighter limits than the global per-IP default (see common/throttle.ts).
  @Throttle(perIp(10, minutes(60)))
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(perIpAndEmail(10, minutes(15)))
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh-token')
  @HttpCode(200)
  refresh(@CurrentUser() payload: unknown) {
    return this.authService.refresh(payload as JwtPayload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  logout() {
    return this.authService.logout();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profileUpload')
  async profileUpload(@CurrentUser() user: AuthenticatedUser, @Req() req: FastifyRequest) {
    const file = await req.file();
    if (!file) {
      return { message: 'No file provided' };
    }
    const buffer = await file.toBuffer();
    const stored = await this.fileStorage.store('profiles', user.id.toString(), file.filename, buffer);
    return this.authService.updateProfileImage(user.id, stored.relativePath);
  }

  @Throttle(perIp(5, minutes(60)))
  @Post('forget-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle(perIp(10, minutes(15)))
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
