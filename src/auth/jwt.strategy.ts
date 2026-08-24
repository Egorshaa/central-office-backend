import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ActorType } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.tokenType !== 'access') throw new UnauthorizedException('Неверный тип токена');

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { admin: true, shop: true },
    });
    const now = Date.now();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.version !== payload.sv ||
      session.actorType !== payload.actorType
    ) {
      throw new UnauthorizedException('Сессия завершена или токен устарел');
    }

    const actorMatches =
      (payload.actorType === ActorType.ADMIN && session.adminId === payload.sub) ||
      (payload.actorType === ActorType.SHOP && session.shopId === payload.sub);
    if (!actorMatches) throw new UnauthorizedException('Неверная сессия');

    if (payload.actorType === ActorType.ADMIN && session.admin) {
      return {
        id: session.admin.id,
        actorType: ActorType.ADMIN,
        sessionId: session.id,
        sessionVersion: session.version,
        role: session.admin.role,
        email: session.admin.email,
      };
    }
    if (payload.actorType === ActorType.SHOP && session.shop) {
      return {
        id: session.shop.id,
        actorType: ActorType.SHOP,
        sessionId: session.id,
        sessionVersion: session.version,
        login: session.shop.login,
      };
    }
    throw new UnauthorizedException('Пользователь не найден');
  }
}
