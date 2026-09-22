import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';

// Mirrors the original CategoryController (`categories` routes) but
// completes the CRUD - only index/show were implemented in Laravel, the
// rest were stubs (see MIGRATION_ROADMAP.md). Read routes are public -
// categories are needed to browse/filter hospitals without an account (see
// same note on HospitalsController). Mutations are admin-only.
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.list();
  }

  // Must come before the `:id` route below so "list" isn't swallowed as an
  // id param (every frontend call site requests this exact path).
  @Get('list')
  listAlias() {
    return this.categoriesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(BigInt(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles('admin')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(BigInt(id), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(BigInt(id));
  }
}
