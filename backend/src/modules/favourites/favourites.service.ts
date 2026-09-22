import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateFavouriteDto } from './dto/create-favourite.dto';

@Injectable()
export class FavouritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.favourite.findMany({
      where: { userId: user.id },
      include: { hospital: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // `@@unique([userId, hospitalId])` means a second favourite of the same
  // hospital would otherwise throw a unique-constraint error. Using upsert
  // instead of check-then-insert avoids the race condition between the
  // check and the insert, and makes re-favouriting an idempotent no-op.
  async create(user: AuthenticatedUser, dto: CreateFavouriteDto) {
    const hospitalId = BigInt(dto.hospitalId);
    return this.prisma.favourite.upsert({
      where: { userId_hospitalId: { userId: user.id, hospitalId } },
      create: { userId: user.id, hospitalId },
      update: {},
      include: { hospital: true },
    });
  }

  async remove(user: AuthenticatedUser, id: bigint) {
    const favourite = await this.prisma.favourite.findUnique({ where: { id } });
    // Don't leak whether a favourite id exists at all if it belongs to
    // someone else - just report not found either way.
    if (!favourite || favourite.userId !== user.id) {
      throw new NotFoundException('Favourite not found');
    }

    await this.prisma.favourite.delete({ where: { id } });
    return { message: 'Favourite removed' };
  }

  async removeByHospital(user: AuthenticatedUser, hospitalId: bigint) {
    const favourite = await this.prisma.favourite.findUnique({
      where: { userId_hospitalId: { userId: user.id, hospitalId } },
    });
    if (!favourite) {
      throw new NotFoundException('Favourite not found');
    }

    await this.prisma.favourite.delete({ where: { id: favourite.id } });
    return { message: 'Favourite removed' };
  }
}
