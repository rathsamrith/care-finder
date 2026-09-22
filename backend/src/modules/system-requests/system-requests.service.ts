import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateSystemRequestDto } from './dto/create-system-request.dto';
import { UpdateSystemRequestDto } from './dto/update-system-request.dto';

const SYSTEM_REQUEST_INCLUDE = {
  category: true,
  user: { select: { id: true, firstName: true, lastName: true, name: true, email: true } },
} as const;

@Injectable()
export class SystemRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // admin sees every request; everyone else sees only their own.
  async list(user: AuthenticatedUser) {
    const isAdmin = user.roles.includes('admin');
    return this.prisma.systemRequest.findMany({
      where: isAdmin ? undefined : { userId: user.id },
      include: SYSTEM_REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async categories() {
    return this.prisma.systemRequestCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(user: AuthenticatedUser, id: bigint) {
    const request = await this.getOwnedOrAdminOrThrow(user, id);
    return request;
  }

  async create(user: AuthenticatedUser, dto: CreateSystemRequestDto) {
    const category = await this.prisma.systemRequestCategory.findUnique({
      where: { id: BigInt(dto.categoryId) },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.systemRequest.create({
      data: {
        userId: user.id,
        categoryId: BigInt(dto.categoryId),
        requestDetails: dto.requestDetails,
      },
      include: SYSTEM_REQUEST_INCLUDE,
    });
  }

  // Chosen behavior (documented per task instructions): a non-admin caller
  // may update their own `requestDetails`, but any `requestStatus` they send
  // is silently ignored rather than rejected outright - keeps the endpoint
  // usable for the common "edit my request text" case without erroring out
  // on a field the client may echo back unchanged from a GET response.
  async update(user: AuthenticatedUser, id: bigint, dto: UpdateSystemRequestDto) {
    const request = await this.getOwnedOrAdminOrThrow(user, id);
    const isAdmin = user.roles.includes('admin');

    return this.prisma.systemRequest.update({
      where: { id: request.id },
      data: {
        requestDetails: dto.requestDetails,
        requestStatus: isAdmin ? dto.requestStatus : undefined,
      },
      include: SYSTEM_REQUEST_INCLUDE,
    });
  }

  async remove(user: AuthenticatedUser, id: bigint) {
    const request = await this.getOwnedOrAdminOrThrow(user, id);
    await this.prisma.systemRequest.delete({ where: { id: request.id } });
    return { message: 'System request deleted' };
  }

  private async getOwnedOrAdminOrThrow(user: AuthenticatedUser, id: bigint) {
    const request = await this.prisma.systemRequest.findUnique({
      where: { id },
      include: SYSTEM_REQUEST_INCLUDE,
    });
    if (!request) {
      throw new NotFoundException('System request not found');
    }
    const isOwner = request.userId === user.id;
    const isAdmin = user.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot access this system request');
    }
    return request;
  }
}
