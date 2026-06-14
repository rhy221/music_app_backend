import { createHmac, timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { AuthUser } from './auth.interfaces';

function decodeJwt(token: string, secret: string): { sub: string; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    const sigBuf = Buffer.from(signatureB64, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    if (typeof payload['exp'] === 'number' && Math.floor(Date.now() / 1000) > payload['exp'])
      return null;
    const sub = payload['sub'];
    const role = payload['role'];
    if (typeof sub !== 'string' || !sub) return null;
    return { sub, role: typeof role === 'string' ? role : undefined };
  } catch {
    return null;
  }
}

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

    // Mode 1: gateway injected X-User-Id (normal path)
    if (userId) {
      req.user = { userId, role: role ?? '' } as AuthUser;
      return true;
    }

    // Mode 2: direct JWT (KrakenD CE propagate_claims does not inject headers)
    const authHeader: string | undefined = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const secret =
        process.env['JWT_SECRET'] ??
        process.env['JWT_SECRET_KEY'] ??
        'change-me-in-production-min-32-chars';
      const claims = decodeJwt(token, secret);
      if (claims) {
        req.user = { userId: claims.sub, role: claims.role ?? '' } as AuthUser;
        return true;
      }
    }

    throw new UnauthorizedException('Missing authentication');
  }
}
