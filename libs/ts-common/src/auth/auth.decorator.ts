import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from './auth.interfaces';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/**
 * Marks an endpoint or controller as publicly accessible (no auth required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restricts an endpoint to users with one of the specified roles.
 *
 * @example
 * \@Roles('ARTIST', 'ADMIN')
 * \@Post('upload')
 * async upload() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @example
 * \@Get('profile')
 * async getProfile(\@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);

/**
 * Guard that enforces role restrictions declared with \@Roles().
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    return !!user && roles.includes(user.role);
  }
}
