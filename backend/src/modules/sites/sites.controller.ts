import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SitesService } from './sites.service';
import { UpdateSiteDto } from './dto/update-site.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Public reads live under /sites/*; the owner-facing editor API lives under
// /hospitals/:id/site* (same ownership rules as the rest of /hospitals/:id).
// Route order matters: `slug-available` must precede `:slug`.
@Controller()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get('sites/slug-available')
  slugAvailable(@Query('slug') slug = '', @Query('hospitalId') hospitalId?: string) {
    return this.sitesService.checkSlug(slug, hospitalId ? BigInt(hospitalId) : undefined);
  }

  @Get('sites/:slug')
  publicSite(@Param('slug') slug: string) {
    return this.sitesService.getPublicSite(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('hospitals/:id/site')
  getEditorSite(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.getEditorSite(BigInt(id), user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('hospitals/:id/site/preview')
  preview(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.sitesService.getPreview(BigInt(id), user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('hospitals/:id/site')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(BigInt(id), user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hospitals/:id/uploadLogo')
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) return { message: 'No file provided' };
    return this.sitesService.uploadLogo(BigInt(id), user, file.filename, await file.toBuffer());
  }

  @UseGuards(JwtAuthGuard)
  @Post('hospitals/:id/site/hero')
  async uploadHero(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) return { message: 'No file provided' };
    return this.sitesService.uploadHero(BigInt(id), user, file.filename, await file.toBuffer());
  }
}
