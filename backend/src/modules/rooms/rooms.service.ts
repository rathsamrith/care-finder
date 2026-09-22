import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
  ) {}

  async list(hospitalId?: number) {
    return this.prisma.room.findMany({
      where: hospitalId ? { hospitalId: BigInt(hospitalId) } : undefined,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async create(user: AuthenticatedUser, dto: CreateRoomDto) {
    const hospitalId = BigInt(dto.hospitalId);
    await this.assertHospitalOwnerOrAdmin(hospitalId, user);

    return this.prisma.room.create({
      data: {
        hospitalId,
        name: dto.name,
        numberOfBed: dto.numberOfBed ?? 0,
      },
    });
  }

  async update(id: bigint, user: AuthenticatedUser, dto: UpdateRoomDto) {
    const room = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(room.hospitalId, user);

    return this.prisma.room.update({
      where: { id },
      data: {
        name: dto.name,
        numberOfBed: dto.numberOfBed,
      },
    });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const room = await this.findOne(id);
    await this.assertHospitalOwnerOrAdmin(room.hospitalId, user);

    await this.prisma.room.delete({ where: { id } });
    return { message: 'Room deleted' };
  }

  private async assertHospitalOwnerOrAdmin(hospitalId: bigint, user: AuthenticatedUser): Promise<void> {
    await this.access.assertCanManage(hospitalId, user);
  }
}
