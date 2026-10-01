import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms.query.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Mirrors the original RoomController (`rooms` routes, see
// MIGRATION_ROADMAP.md). All routes require auth; create/update/delete are
// restricted to the owning hospital or an admin (enforced in RoomsService).
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@AnyAuthenticated()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@Query() query: ListRoomsQueryDto) {
    return this.roomsService.list(query.hospitalId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(BigInt(id));
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(user, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(BigInt(id), user, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.remove(BigInt(id), user);
  }
}
