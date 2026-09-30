import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { FavouritesService } from './favourites.service';
import { CreateFavouriteDto } from './dto/create-favourite.dto';

// Personal favourites list - always scoped to the caller, no admin/role
// branching. Mirrors the original `favourites` routes.
@Controller('favourites')
@UseGuards(JwtAuthGuard)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.favouritesService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFavouriteDto) {
    return this.favouritesService.create(user, dto);
  }

  // Two path segments ("by-hospital/:hospitalId"), so this never collides
  // with the single-segment ':id' route below regardless of order -
  // convenience "unfavourite this hospital" endpoint for toggle-button UIs.
  @Delete('by-hospital/:hospitalId')
  removeByHospital(
    @CurrentUser() user: AuthenticatedUser,
    @Param('hospitalId', ParseIntPipe) hospitalId: number,
  ) {
    return this.favouritesService.removeByHospital(user, BigInt(hospitalId));
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.favouritesService.remove(user, BigInt(id));
  }
}
