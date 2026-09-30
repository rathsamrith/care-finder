import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';

// User-facing "select" shape shared by list/show - includes the reviewing
// user's name and any hospital replies, per the roadmap's `feedbacks` spec.
const RATE_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, name: true, profile: true } },
  replies: true,
} as const;

interface MonthlyRateCount {
  month: string;
  count: number;
}

@Injectable()
export class RatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
  ) {}

  async list(hospitalId?: number) {
    return this.prisma.rate.findMany({
      where: hospitalId ? { hospitalId: BigInt(hospitalId) } : undefined,
      include: RATE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const rate = await this.prisma.rate.findUnique({
      where: { id },
      include: RATE_INCLUDE,
    });
    if (!rate) {
      throw new NotFoundException('Rate not found');
    }
    return rate;
  }

  async create(user: AuthenticatedUser, dto: CreateRateDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: BigInt(dto.hospitalId) },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    if (await this.access.isMember(hospital, user.id)) {
      throw new ForbiddenException('You cannot review your own hospital');
    }

    return this.prisma.rate.create({
      data: {
        hospitalId: BigInt(dto.hospitalId),
        userId: user.id,
        content: dto.content,
        star: dto.star,
      },
      include: RATE_INCLUDE,
    });
  }

  async update(user: AuthenticatedUser, id: bigint, dto: UpdateRateDto) {
    const rate = await this.getOwnedRateOrThrow(user, id);

    return this.prisma.rate.update({
      where: { id: rate.id },
      data: {
        content: dto.content,
        star: dto.star,
      },
      include: RATE_INCLUDE,
    });
  }

  async remove(user: AuthenticatedUser, id: bigint) {
    const rate = await this.getOwnedRateOrThrow(user, id);
    await this.prisma.rate.delete({ where: { id: rate.id } });
    return { message: 'Rate deleted' };
  }

  async recent(hospitalId?: number, limit = 10) {
    return this.prisma.rate.findMany({
      where: hospitalId ? { hospitalId: BigInt(hospitalId) } : undefined,
      include: RATE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Prisma's groupBy can't truncate created_at to a month, so this falls
  // back to a raw query grouped by MySQL's DATE_FORMAT - then the 12-month
  // window is filled in so hospitals/months with zero reviews still show up
  // with count 0 rather than being silently absent from the series.
  async monthly(hospitalId?: number): Promise<MonthlyRateCount[]> {
    const rows = hospitalId
      ? await this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
          SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
          FROM rates
          WHERE hospital_id = ${BigInt(hospitalId)}
            AND created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
          GROUP BY month
          ORDER BY month ASC
        `
      : await this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
          SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
          FROM rates
          WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
          GROUP BY month
          ORDER BY month ASC
        `;

    const counts = new Map(rows.map((row) => [row.month, Number(row.count)]));

    const result: MonthlyRateCount[] = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 11);
    for (let i = 0; i < 12; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      result.push({ month: key, count: counts.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }

  async mostRated() {
    const grouped = await this.prisma.rate.groupBy({
      by: ['hospitalId'],
      _avg: { star: true },
      _count: true,
      orderBy: { _avg: { star: 'desc' } },
    });

    if (grouped.length === 0) {
      return [];
    }

    const hospitals = await this.prisma.hospital.findMany({
      where: { id: { in: grouped.map((g) => g.hospitalId) } },
      select: { id: true, name: true, coverImage: true },
    });
    const hospitalById = new Map(hospitals.map((h) => [h.id.toString(), h]));

    return grouped.map((g) => ({
      hospital: hospitalById.get(g.hospitalId.toString()) ?? null,
      hospitalId: g.hospitalId,
      averageStar: g._avg.star ?? 0,
      totalRates: g._count,
    }));
  }

  private async getOwnedRateOrThrow(user: AuthenticatedUser, id: bigint) {
    const rate = await this.prisma.rate.findUnique({ where: { id } });
    if (!rate) {
      throw new NotFoundException('Rate not found');
    }
    const isOwner = rate.userId === user.id;
    const isAdmin = user.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot modify this rate');
    }
    return rate;
  }
}
