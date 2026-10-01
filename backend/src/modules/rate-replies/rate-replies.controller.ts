import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { RateRepliesService } from './rate-replies.service';
import { CreateRateReplyDto } from './dto/create-rate-reply.dto';
import { UpdateRateReplyDto } from './dto/update-rate-reply.dto';
import { ListRateRepliesQueryDto } from './dto/list-rate-replies.query.dto';

// Mirrors the original `feedback-reply` routes (hospital-only) - see
// MIGRATION_ROADMAP.md's route mapping table.
@Controller('rate-replies')
@UseGuards(JwtAuthGuard, RolesGuard)
@AnyAuthenticated()
export class RateRepliesController {
  constructor(private readonly rateRepliesService: RateRepliesService) {}

  @Get()
  list(@Query() query: ListRateRepliesQueryDto) {
    return this.rateRepliesService.list(query.rateId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRateReplyDto) {
    return this.rateRepliesService.create(user, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rateRepliesService.findOne(BigInt(id));
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRateReplyDto,
  ) {
    return this.rateRepliesService.update(user, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.rateRepliesService.remove(user, BigInt(id));
  }
}
