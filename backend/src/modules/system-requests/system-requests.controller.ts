import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SystemRequestsService } from './system-requests.service';
import { CreateSystemRequestDto } from './dto/create-system-request.dto';
import { UpdateSystemRequestDto } from './dto/update-system-request.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Mirrors Laravel's `GET/GET categories/POST/GET :id/PUT :id/DELETE :id
// system-requests` group (see MIGRATION_ROADMAP.md). All routes require
// auth - there was no public system-requests endpoint in the original app.
@Controller('system-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemRequestsController {
  constructor(private readonly systemRequestsService: SystemRequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.systemRequestsService.list(user);
  }

  // Must come before the `:id` route below so "categories" isn't swallowed
  // as an id param.
  @Get('categories')
  categories() {
    return this.systemRequestsService.categories();
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSystemRequestDto) {
    return this.systemRequestsService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.systemRequestsService.findOne(user, BigInt(id));
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemRequestDto,
  ) {
    return this.systemRequestsService.update(user, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.systemRequestsService.remove(user, BigInt(id));
  }
}
