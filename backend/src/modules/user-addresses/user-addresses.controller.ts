import { AnyAuthenticated } from '../../core/auth/decorators/any-authenticated.decorator';
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
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Laravel's `UserAddressController` only implemented `index` - this
// completes the resource with full CRUD per MIGRATION_ROADMAP.md's Phase 6
// note. Every route is scoped to the caller's own addresses, with no
// cross-user access (same treatment as Favourites - personal data, not even
// admin-readable through this resource).
@Controller('user-addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@AnyAuthenticated()
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.userAddressesService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserAddressDto) {
    return this.userAddressesService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.userAddressesService.findOne(user, BigInt(id));
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.userAddressesService.update(user, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.userAddressesService.remove(user, BigInt(id));
  }
}
