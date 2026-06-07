import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { AuthUser } from './auth.interfaces';

/**
 * Reads X-User-Id and X-User-Role headers set by the API Gateway after JWT validation.
 * Does NOT validate JWTs — that is the gateway's responsibility.
 * Endpoints marked with \@Public() bypass this guard.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.headers['x-user-id'];
    const role: string | undefined = req.headers['x-user-role'];

    if (!userId) {
      throw new UnauthorizedException('Missing X-User-Id header');
    }

    const user: AuthUser = { userId, role: role ?? '' };
    req.user = user;
    return true;
  }
}
