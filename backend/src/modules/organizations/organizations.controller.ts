import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { minutes, perIp } from '../../common/throttle';
import { OrganizationsService } from './organizations.service';
import { AcceptInviteDto, ChangeRoleDto, CreateInviteDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Team management for hospital accounts. Per-organization permissions (who may
// invite, change roles, remove) are enforced in OrganizationsService; the
// guards here only require a signed-in hospital account.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hospital')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.mine(user);
  }

  // Literal route: must stay above the `:id/...` routes.
  @Throttle(perIp(10, minutes(15)))
  @Post('invites/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInviteDto) {
    return this.organizations.accept(user, dto.token);
  }

  @Throttle(perIp(20, minutes(60)))
  @Post(':id/invites')
  invite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInviteDto,
  ) {
    return this.organizations.invite(user, BigInt(id), dto);
  }

  @Delete(':id/invites/:inviteId')
  revoke(
    @Param('id', ParseIntPipe) id: number,
    @Param('inviteId', ParseIntPipe) inviteId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.revokeInvite(user, BigInt(id), BigInt(inviteId));
  }

  @Put(':id/members/:userId')
  changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.organizations.changeRole(user, BigInt(id), BigInt(userId), dto.role);
  }

  @Delete(':id/members/:userId')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.removeMember(user, BigInt(id), BigInt(userId));
  }
}
