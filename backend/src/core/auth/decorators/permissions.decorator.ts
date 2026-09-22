import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// Usage: @Permissions('Hospital create') - formalizes the Laravel Admin
// panel's `role_or_permission:'{Entity} {action}'` middleware convention as
// a typed decorator, reusable on the API surface too.
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
