import { SetMetadata } from '@nestjs/common';

export const ANY_AUTHENTICATED_KEY = 'anyAuthenticated';

// Explicit opt-in for handlers behind RolesGuard that any signed-in user may
// call, with ownership enforced in the service. RolesGuard denies a handler
// that declares no @Roles, @Permissions or @AnyAuthenticated, so a forgotten
// policy fails closed instead of open.
export const AnyAuthenticated = () => SetMetadata(ANY_AUTHENTICATED_KEY, true);
