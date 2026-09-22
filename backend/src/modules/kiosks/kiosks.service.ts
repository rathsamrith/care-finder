import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

const MAX_KIOSKS_PER_HOSPITAL = 10;
const SEEN_UPDATE_EVERY_MS = 5 * 60_000;

export const hashKioskKey = (key: string) => createHash('sha256').update(key).digest('hex');

// Check-in tablets. Managing them needs the Admin role in the hospital's
// organization (a device key lets a tablet write check-ins). The key is shown
// once when created; only its hash is stored, like a password.
@Injectable()
export class KiosksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
  ) {}

  async create(user: AuthenticatedUser, hospitalId: bigint, dto: { name: string; prefix: string }) {
    await this.access.assertCanManage(hospitalId, user, 'Admin');
    const active = await this.prisma.kiosk.count({ where: { hospitalId, revokedAt: null } });
    if (active >= MAX_KIOSKS_PER_HOSPITAL) {
      throw new ConflictException(`A hospital can have at most ${MAX_KIOSKS_PER_HOSPITAL} kiosks`);
    }

    const key = `kk_${randomBytes(32).toString('hex')}`;
    const kiosk = await this.prisma.kiosk.create({
      data: { hospitalId, name: dto.name, prefix: dto.prefix, keyHash: hashKioskKey(key) },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });
    return { ...kiosk, key }; // the only time the key is ever returned
  }

  async list(user: AuthenticatedUser, hospitalId: bigint) {
    await this.access.assertCanManage(hospitalId, user, 'Admin');
    return this.prisma.kiosk.findMany({
      where: { hospitalId, revokedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, prefix: true, lastSeenAt: true, createdAt: true },
    });
  }

  async revoke(user: AuthenticatedUser, hospitalId: bigint, kioskId: bigint) {
    await this.access.assertCanManage(hospitalId, user, 'Admin');
    const result = await this.prisma.kiosk.updateMany({
      where: { id: kioskId, hospitalId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Kiosk not found');
    return { message: 'Kiosk revoked' };
  }

  // Used by KioskGuard on every tablet request.
  async authenticate(rawKey: string) {
    if (!/^kk_[a-f0-9]{64}$/.test(rawKey ?? '')) throw new UnauthorizedException('Invalid kiosk key');
    const kiosk = await this.prisma.kiosk.findUnique({
      where: { keyHash: hashKioskKey(rawKey) },
      include: { hospital: { select: { id: true, name: true } } },
    });
    if (!kiosk || kiosk.revokedAt) throw new UnauthorizedException('Invalid kiosk key');

    // "Last seen" is for the hospital's benefit (is the tablet online?); no need
    // to write it on every scan.
    if (!kiosk.lastSeenAt || Date.now() - kiosk.lastSeenAt.getTime() > SEEN_UPDATE_EVERY_MS) {
      void this.prisma.kiosk.update({ where: { id: kiosk.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    }
    return kiosk;
  }
}
