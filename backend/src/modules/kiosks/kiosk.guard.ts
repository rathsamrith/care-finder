import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { KiosksService } from './kiosks.service';

export type AuthenticatedKiosk = Awaited<ReturnType<KiosksService['authenticate']>>;

// Authenticates a check-in tablet by its device key (`X-Kiosk-Key` header) and
// puts the kiosk on the request. No user account is involved.
@Injectable()
export class KioskGuard implements CanActivate {
  constructor(private readonly kiosks: KiosksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.['x-kiosk-key'];
    if (typeof header !== 'string') throw new UnauthorizedException('Kiosk key required');
    request.kiosk = await this.kiosks.authenticate(header);
    return true;
  }
}

export const CurrentKiosk = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedKiosk => context.switchToHttp().getRequest().kiosk,
);
