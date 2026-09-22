import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { SubscribePlansService } from './subscribe-plans.service';
import { CreateSubscribePlanDto } from './dto/create-subscribe-plan.dto';
import { UpdateSubscribePlanDto } from './dto/update-subscribe-plan.dto';

// Mirrors the original SubscribePlanController (`subscribePlan` routes) but
// completes the CRUD - only `index` was implemented in Laravel, the rest
// were stubs. See MIGRATION_ROADMAP.md, Phase 5.
@Controller('subscribe-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscribePlansController {
  constructor(private readonly subscribePlansService: SubscribePlansService) {}

  @Get()
  list() {
    return this.subscribePlansService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscribePlansService.findOne(BigInt(id));
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateSubscribePlanDto) {
    return this.subscribePlansService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubscribePlanDto) {
    return this.subscribePlansService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subscribePlansService.remove(BigInt(id));
  }
}
