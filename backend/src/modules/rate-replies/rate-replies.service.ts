import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateRateReplyDto } from './dto/create-rate-reply.dto';
import { UpdateRateReplyDto } from './dto/update-rate-reply.dto';

@Injectable()
export class RateRepliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
  ) {}

  async list(rateId?: number) {
    return this.prisma.rateReply.findMany({
      where: rateId ? { rateId: BigInt(rateId) } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: bigint) {
    const reply = await this.prisma.rateReply.findUnique({ where: { id } });
    if (!reply) {
      throw new NotFoundException('Rate reply not found');
    }
    return reply;
  }

  // Only the hospital that owns the rate being replied to (or an admin) may
  // reply - `hospitalId` is never client-supplied, it's derived from the
  // rate itself so it can never drift from `rate.hospitalId`.
  async create(user: AuthenticatedUser, dto: CreateRateReplyDto) {
    const rate = await this.prisma.rate.findUnique({ where: { id: BigInt(dto.rateId) } });
    if (!rate) {
      throw new NotFoundException('Rate not found');
    }

    await this.assertCanReply(user, rate.hospitalId);

    return this.prisma.rateReply.create({
      data: {
        rateId: rate.id,
        hospitalId: rate.hospitalId,
        content: dto.content,
      },
    });
  }

  async update(user: AuthenticatedUser, id: bigint, dto: UpdateRateReplyDto) {
    const reply = await this.findOne(id);
    await this.assertCanReply(user, reply.hospitalId);

    return this.prisma.rateReply.update({
      where: { id: reply.id },
      data: { content: dto.content },
    });
  }

  async remove(user: AuthenticatedUser, id: bigint) {
    const reply = await this.findOne(id);
    await this.assertCanReply(user, reply.hospitalId);

    await this.prisma.rateReply.delete({ where: { id: reply.id } });
    return { message: 'Rate reply deleted' };
  }

  private async assertCanReply(user: AuthenticatedUser, hospitalId: bigint) {
    if (user.roles.includes('admin')) {
      return;
    }

    if (!(await this.access.canManage(hospitalId, user))) {
      throw new ForbiddenException('Only the reviewed hospital may reply to this rate');
    }
  }
}
