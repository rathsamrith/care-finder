import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Applied per-route (mirrors Laravel's per-route `auth:sanctum` middleware)
// rather than as a global guard, since several routes stay public
// (login, register, forget-password, reset-password).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
