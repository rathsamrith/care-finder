import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { minutes, perIp } from '../../common/throttle';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CheckInService } from '../appointments/check-in.service';
import { CreateKioskDto, KioskCheckInDto } from './dto/kiosk.dto';
import { AuthenticatedKiosk, CurrentKiosk, KioskGuard } from './kiosk.guard';
import { KiosksService } from './kiosks.service';

@Controller()
export class KiosksController {
  constructor(
    private readonly kiosks: KiosksService,
    private readonly checkIn: CheckInService,
  ) {}

  // ---- managed by the hospital (signed-in, Admin+ in the organization) ----------
  @UseGuards(JwtAuthGuard)
  @Post('hospitals/:id/kiosks')
  create(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateKioskDto) {
    return this.kiosks.create(user, BigInt(id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('hospitals/:id/kiosks')
  list(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.kiosks.list(user, BigInt(id));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('hospitals/:id/kiosks/:kioskId')
  revoke(
    @Param('id', ParseIntPipe) id: number,
    @Param('kioskId', ParseIntPipe) kioskId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kiosks.revoke(user, BigInt(id), BigInt(kioskId));
  }

  // ---- used by the tablet itself (device key, no account) -----------------------
  @UseGuards(KioskGuard)
  @Get('kiosk/me')
  me(@CurrentKiosk() kiosk: AuthenticatedKiosk) {
    return { name: kiosk.name, prefix: kiosk.prefix, hospital: kiosk.hospital };
  }

  @UseGuards(KioskGuard)
  @Throttle(perIp(120, minutes(1)))
  @Post('kiosk/check-in')
  checkInPatient(@CurrentKiosk() kiosk: AuthenticatedKiosk, @Body() dto: KioskCheckInDto) {
    return this.checkIn.checkInByKiosk(kiosk, dto.code);
  }
}
