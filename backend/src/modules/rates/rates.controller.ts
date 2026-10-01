import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { ListRatesQueryDto } from './dto/list-rates.query.dto';
import { RecentRatesQueryDto } from './dto/recent-rates.query.dto';
import { MonthlyRatesQueryDto } from './dto/monthly-rates.query.dto';

// Mirrors the original FeedbackController (`feedbacks` routes) - see
// MIGRATION_ROADMAP.md's route mapping table.
@Controller('rates')
@UseGuards(JwtAuthGuard, RolesGuard)
@AnyAuthenticated()
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  // Static sub-routes must be declared before ':id' so Nest doesn't try to
  // parse "recent"/"monthly"/"most-rated" as a rate id.
  @Get('recent')
  recent(@Query() query: RecentRatesQueryDto) {
    return this.ratesService.recent(query.hospitalId, query.limit ?? 10);
  }

  @Get('monthly')
  monthly(@Query() query: MonthlyRatesQueryDto) {
    return this.ratesService.monthly(query.hospitalId);
  }

  @Get('most-rated')
  mostRated() {
    return this.ratesService.mostRated();
  }

  @Get()
  list(@Query() query: ListRatesQueryDto) {
    return this.ratesService.list(query.hospitalId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRateDto) {
    return this.ratesService.create(user, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ratesService.findOne(BigInt(id));
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRateDto,
  ) {
    return this.ratesService.update(user, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.ratesService.remove(user, BigInt(id));
  }
}
