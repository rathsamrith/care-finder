import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSubscribePlanDto } from './dto/create-subscribe-plan.dto';
import { UpdateSubscribePlanDto } from './dto/update-subscribe-plan.dto';

@Injectable()
export class SubscribePlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.subscribePlan.findMany({ orderBy: { price: 'asc' } });
  }

  async findOne(id: bigint) {
    const plan = await this.prisma.subscribePlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Subscribe plan not found');
    }
    return plan;
  }

  async create(dto: CreateSubscribePlanDto) {
    return this.prisma.subscribePlan.create({
      data: {
        name: dto.name,
        price: dto.price,
        currency: dto.currency,
        duration: dto.duration,
      },
    });
  }

  async update(id: bigint, dto: UpdateSubscribePlanDto) {
    await this.findOne(id);

    return this.prisma.subscribePlan.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price,
        currency: dto.currency,
        duration: dto.duration,
      },
    });
  }

  // Plans referenced by existing SubscribePayment rows can't be deleted
  // (FK constraint) - caught here and turned into a clear 400 instead of
  // letting Prisma's raw constraint-violation error bubble up.
  async remove(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.subscribePlan.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Cannot delete a plan with existing payments');
      }
      throw error;
    }

    return { message: 'Subscribe plan deleted' };
  }
}
