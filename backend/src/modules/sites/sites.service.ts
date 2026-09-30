import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { extname } from 'path';
import { PrismaService } from '../../core/prisma/prisma.service';
import { HospitalAccessService } from '../../core/access/hospital-access.service';
import { FileStorageService } from '../../core/file-storage/file-storage.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UpdateSiteDto } from './dto/update-site.dto';
import { DEFAULT_SECTIONS, DEFAULT_THEME, slugify, validateSlug } from './site-catalog';
import {
  SanitizedSiteConfig,
  cleanText,
  downgradeForFreeTier,
  sanitizeSiteConfig,
} from './site-config.util';

// SVG is excluded on purpose: served from our own origin, it can carry script.
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HospitalAccessService,
    private readonly fileStorage: FileStorageService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async checkSlug(slug: string, excludeHospitalId?: bigint) {
    const normalized = slug.trim().toLowerCase();
    const problem = validateSlug(normalized);
    if (problem) return { slug: normalized, available: false, reason: problem };

    const existing = await this.prisma.hospital.findUnique({ where: { slug: normalized } });
    if (existing && existing.id !== excludeHospitalId) {
      return { slug: normalized, available: false, reason: 'This address is already taken' };
    }
    return { slug: normalized, available: true };
  }

  // Public: what the subdomain site renders. 404 (not 403) for unpublished or
  // unknown slugs so slugs can't be probed for existence of drafts.
  async getPublicSite(slug: string) {
    const hospital = await this.loadForSite({ slug: slug.toLowerCase() });
    if (!hospital || !hospital.site?.published) {
      throw new NotFoundException('Site not found');
    }
    return this.buildPublicPayload(hospital);
  }

  // Owner-only: the same payload as the public site, but regardless of
  // `published`, so the editor can render a live preview of a draft.
  async getPreview(hospitalId: bigint, user: AuthenticatedUser) {
    await this.getOwnedOrThrow(hospitalId, user);
    const hospital = await this.loadForSite({ id: hospitalId });
    if (!hospital) throw new NotFoundException('Hospital not found');
    return this.buildPublicPayload(hospital);
  }

  private loadForSite(where: Prisma.HospitalWhereUniqueInput) {
    return this.prisma.hospital.findUnique({
      where,
      include: {
        site: true,
        category: true,
        departments: true,
        services: { orderBy: { id: 'asc' } },
        previewImages: { orderBy: { id: 'desc' }, take: 24 },
        promotions: { where: { endDate: { gte: startOfToday() } }, orderBy: { startDate: 'asc' } },
        doctors: { include: { user: { select: { firstName: true, lastName: true, name: true, profile: true } } } },
        rates: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true } } },
        },
      },
    });
  }

  private async buildPublicPayload(
    hospital: NonNullable<Awaited<ReturnType<SitesService['loadForSite']>>>,
  ) {
    const site = hospital.site;
    const entitled = await this.subscriptions.hasActiveSubscription(hospital.userId);
    const stored = site ? this.readConfig(site) : sanitizeSiteConfig({}, false);
    const config = entitled ? stored : downgradeForFreeTier(stored);
    const ratingCount = hospital.rates.length;
    const url = (p: string | null) => this.fileStorage.resolveUrl(p);

    return {
      slug: hospital.slug,
      hospitalId: hospital.id,
      name: hospital.name,
      logo: url(hospital.logo),
      coverImage: url(hospital.coverImage),
      category: hospital.category?.name ?? null,
      phoneNumber: hospital.phoneNumber,
      openTime: hospital.openTime,
      closeTime: hospital.closeTime,
      mission: hospital.mission,
      vision: hospital.vision,
      address: {
        street: hospital.streetAddress,
        village: hospital.village,
        commune: hospital.commune,
        district: hospital.district,
        province: hospital.province,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
      },
      site: {
        ...config,
        heroImage: url(site?.heroImage ?? null),
        heroTitle: site?.heroTitle ?? null,
        heroSubtitle: site?.heroSubtitle ?? null,
        seoTitle: site?.seoTitle ?? null,
        seoDescription: site?.seoDescription ?? null,
      },
      rating: {
        average: ratingCount ? hospital.rates.reduce((sum, r) => sum + r.star, 0) / ratingCount : 0,
        count: ratingCount,
      },
      services: hospital.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        image: url(s.image),
      })),
      departments: hospital.departments.map((d) => ({
        id: d.id,
        name: d.name,
        details: d.details,
        image: url(d.image),
      })),
      doctors: hospital.doctors.map((d) => ({
        id: d.id,
        name: d.user.name || `${d.user.firstName ?? ''} ${d.user.lastName ?? ''}`.trim(),
        profile: url(d.user.profile),
      })),
      gallery: hospital.previewImages.map((p) => ({ id: p.id, url: url(p.imageName) })),
      promotions: hospital.promotions.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        image: url(p.image),
        startDate: p.startDate,
        endDate: p.endDate,
      })),
      reviews: hospital.rates
        .filter((r) => r.content)
        .slice(0, 10)
        .map((r) => ({ id: r.id, author: r.user.firstName ?? 'Guest', star: r.star, content: r.content })),
    };
  }

  async getEditorSite(hospitalId: bigint, user: AuthenticatedUser) {
    const hospital = await this.getOwnedOrThrow(hospitalId, user);
    const site = await this.prisma.hospitalSite.findUnique({ where: { hospitalId } });
    const entitled = await this.subscriptions.hasActiveSubscription(hospital.userId);
    return this.toEditorPayload(hospital, site, entitled);
  }

  async update(hospitalId: bigint, user: AuthenticatedUser, dto: UpdateSiteDto) {
    const hospital = await this.getOwnedOrThrow(hospitalId, user);
    const entitled = await this.subscriptions.hasActiveSubscription(hospital.userId);
    const existing = await this.prisma.hospitalSite.findUnique({ where: { hospitalId } });

    // Merge onto the stored config so partial saves (e.g. just `published`)
    // don't reset the theme/sections to defaults.
    const stored = existing ? this.readConfig(existing) : undefined;
    // A lapsed subscriber's saved premium picks must not block unrelated saves
    // (e.g. toggling `published`) - fall back to the free-tier view of them.
    const base = stored && !entitled ? downgradeForFreeTier(stored) : stored;
    const config = sanitizeSiteConfig(
      {
        template: dto.template ?? base?.template,
        theme: dto.theme ?? base?.theme,
        sections: dto.sections ?? base?.sections,
      },
      entitled,
    );

    let slug = hospital.slug;
    if (dto.slug !== undefined) {
      const check = await this.checkSlug(dto.slug, hospitalId);
      if (!check.available) throw new BadRequestException(check.reason);
      slug = check.slug;
    }
    if (dto.published && !slug) {
      throw new BadRequestException('Choose a site address before publishing');
    }

    const data = {
      template: config.template,
      theme: config.theme as unknown as Prisma.InputJsonValue,
      sections: config.sections as unknown as Prisma.InputJsonValue,
      heroTitle: dto.heroTitle !== undefined ? cleanText(dto.heroTitle) ?? null : existing?.heroTitle,
      heroSubtitle: dto.heroSubtitle !== undefined ? cleanText(dto.heroSubtitle) ?? null : existing?.heroSubtitle,
      seoTitle: dto.seoTitle !== undefined ? cleanText(dto.seoTitle) ?? null : existing?.seoTitle,
      seoDescription:
        dto.seoDescription !== undefined ? cleanText(dto.seoDescription) ?? null : existing?.seoDescription,
      published: dto.published ?? existing?.published ?? false,
    };

    try {
      const [updatedHospital, site] = await this.prisma.$transaction([
        this.prisma.hospital.update({ where: { id: hospitalId }, data: { slug } }),
        this.prisma.hospitalSite.upsert({
          where: { hospitalId },
          create: { hospitalId, ...data },
          update: data,
        }),
      ]);
      return this.toEditorPayload(updatedHospital, site, entitled);
    } catch (error) {
      // Lost a race on the unique slug between checkSlug() and the write.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This address is already taken');
      }
      throw error;
    }
  }

  async uploadLogo(hospitalId: bigint, user: AuthenticatedUser, filename: string, buffer: Buffer) {
    const hospital = await this.getOwnedOrThrow(hospitalId, user);
    this.assertImage(filename);
    const stored = await this.fileStorage.store('hospitals/logos', hospitalId.toString(), filename, buffer);
    const updated = await this.prisma.hospital.update({
      where: { id: hospitalId },
      data: { logo: stored.relativePath },
    });
    return { logo: this.fileStorage.resolveUrl(updated.logo) };
  }

  async uploadHero(hospitalId: bigint, user: AuthenticatedUser, filename: string, buffer: Buffer) {
    await this.getOwnedOrThrow(hospitalId, user);
    this.assertImage(filename);
    const stored = await this.fileStorage.store('hospitals/site-heroes', hospitalId.toString(), filename, buffer);
    const config = sanitizeSiteConfig({}, false);
    const site = await this.prisma.hospitalSite.upsert({
      where: { hospitalId },
      create: {
        hospitalId,
        template: config.template,
        theme: config.theme as unknown as Prisma.InputJsonValue,
        sections: config.sections as unknown as Prisma.InputJsonValue,
        heroImage: stored.relativePath,
      },
      update: { heroImage: stored.relativePath },
    });
    return { heroImage: this.fileStorage.resolveUrl(site.heroImage) };
  }

  private assertImage(filename: string) {
    if (!IMAGE_EXTENSIONS.has(extname(filename).toLowerCase())) {
      throw new BadRequestException('Only PNG, JPG, WEBP or GIF images are allowed');
    }
  }

  private readConfig(site: { template: string; theme: unknown; sections: unknown }): SanitizedSiteConfig {
    // Stored values were sanitized on write; re-sanitizing as entitled=true
    // guards against a hand-edited row without rejecting lapsed premium picks
    // (those are handled by downgradeForFreeTier on read).
    try {
      return sanitizeSiteConfig(
        { template: site.template, theme: site.theme, sections: site.sections },
        true,
      );
    } catch {
      return { template: 'classic', theme: { ...DEFAULT_THEME }, sections: DEFAULT_SECTIONS.map((s) => ({ ...s })) };
    }
  }

  private toEditorPayload(
    hospital: { id: bigint; name: string; slug: string | null; logo: string | null },
    site: Awaited<ReturnType<PrismaService['hospitalSite']['findUnique']>>,
    entitled: boolean,
  ) {
    const config = site
      ? this.readConfig(site)
      : sanitizeSiteConfig({}, false);
    return {
      hospitalId: hospital.id,
      name: hospital.name,
      slug: hospital.slug,
      suggestedSlug: hospital.slug ?? slugify(hospital.name),
      logo: this.fileStorage.resolveUrl(hospital.logo),
      entitled,
      ...config,
      heroImage: this.fileStorage.resolveUrl(site?.heroImage),
      heroTitle: site?.heroTitle ?? null,
      heroSubtitle: site?.heroSubtitle ?? null,
      seoTitle: site?.seoTitle ?? null,
      seoDescription: site?.seoDescription ?? null,
      published: site?.published ?? false,
    };
  }

  private getOwnedOrThrow(id: bigint, user: AuthenticatedUser) {
    return this.access.assertCanManage(id, user);
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
