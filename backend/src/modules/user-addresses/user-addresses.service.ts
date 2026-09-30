import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

const LOCATION_FIELDS = [
  'village',
  'commune',
  'district',
  'province',
  'latitude',
  'longitude',
] as const;

// The original Laravel `UserAddressController` only implemented `index`.
// This pass completes it with full CRUD, always scoped to the caller - like
// Favourites, this is personal data with no cross-user access, not even for
// admins.
@Injectable()
export class UserAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.userAddress.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: bigint) {
    return this.getOwnedOrThrow(user, id);
  }

  async create(user: AuthenticatedUser, dto: CreateUserAddressDto) {
    const hasAnyLocationField = LOCATION_FIELDS.some((field) => !!dto[field]);
    if (!hasAnyLocationField) {
      throw new BadRequestException('At least one location field is required');
    }

    return this.prisma.userAddress.create({
      data: {
        userId: user.id,
        village: dto.village,
        commune: dto.commune,
        district: dto.district,
        province: dto.province,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async update(user: AuthenticatedUser, id: bigint, dto: UpdateUserAddressDto) {
    const address = await this.getOwnedOrThrow(user, id);

    return this.prisma.userAddress.update({
      where: { id: address.id },
      data: {
        village: dto.village,
        commune: dto.commune,
        district: dto.district,
        province: dto.province,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: bigint) {
    const address = await this.getOwnedOrThrow(user, id);
    await this.prisma.userAddress.delete({ where: { id: address.id } });
    return { message: 'Address deleted' };
  }

  // Scoped by userId in the query itself (not just checked after the fact)
  // so an address owned by another user 404s rather than 403s - no
  // information about other users' addresses leaks either way.
  private async getOwnedOrThrow(user: AuthenticatedUser, id: bigint) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId: user.id },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }
}
