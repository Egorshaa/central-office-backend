import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ActorType, Admin, Session, Shop } from '@prisma/client';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { verifyPassword } from '../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ShopLoginDto } from './dto/shop-login.dto';

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: number;
  user: {
    id: string;
    actorType: ActorType;
    name: string;
    identifier: string;
    role?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessTtl = config.getOrThrow<number>('ACCESS_TOKEN_TTL_SECONDS');
    this.refreshTtl = config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS');
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async loginAdmin(dto: LoginDto): Promise<TokenPairResponse> {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin || !(await verifyPassword(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const session = await this.rotateLoginSession(ActorType.ADMIN, admin.id);
    return this.issueAndStore(session, admin);
  }

  async loginShop(dto: ShopLoginDto): Promise<TokenPairResponse> {
    const login = dto.login.trim().toLowerCase();
    const shop = await this.prisma.shop.findUnique({ where: { login } });
    if (!shop || !(await verifyPassword(dto.password, shop.passwordHash))) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const session = await this.rotateLoginSession(ActorType.SHOP, shop.id);
    return this.issueAndStore(session, shop);
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh-токен недействителен или истёк');
    }
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Неверный тип токена');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { admin: true, shop: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.version !== payload.sv ||
      session.actorType !== payload.actorType ||
      !this.hashesMatch(session.refreshTokenHash, this.tokenHash(refreshToken))
    ) {
      throw new UnauthorizedException('Refresh-токен отозван или заменён');
    }

    const actorMatches =
      (payload.actorType === ActorType.ADMIN && session.adminId === payload.sub) ||
      (payload.actorType === ActorType.SHOP && session.shopId === payload.sub);
    if (!actorMatches) throw new UnauthorizedException('Неверная сессия');

    const updated = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        version: session.version,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        version: { increment: 1 },
        refreshTokenHash: this.pendingHash(),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });
    if (updated.count !== 1) throw new UnauthorizedException('Refresh-токен уже использован');

    const rotated = await this.prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    const actor = payload.actorType === ActorType.ADMIN ? session.admin : session.shop;
    if (!actor) throw new UnauthorizedException('Пользователь не найден');
    return this.issueAndStore(rotated, actor);
  }

  async logout(user: RequestUser): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: user.sessionId, version: user.sessionVersion, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeActorSession(actorType: ActorType, actorId: string): Promise<void> {
    const session =
      actorType === ActorType.ADMIN
        ? await this.prisma.session.findUnique({ where: { adminId: actorId } })
        : await this.prisma.session.findUnique({ where: { shopId: actorId } });
    if (!session) return;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), version: { increment: 1 } },
    });
  }

  private async rotateLoginSession(actorType: ActorType, actorId: string): Promise<Session> {
    const data = {
      actorType,
      refreshTokenHash: this.pendingHash(),
      expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      revokedAt: null,
    };

    if (actorType === ActorType.ADMIN) {
      return this.prisma.session.upsert({
        where: { adminId: actorId },
        create: { ...data, adminId: actorId },
        update: { ...data, version: { increment: 1 } },
      });
    }
    return this.prisma.session.upsert({
      where: { shopId: actorId },
      create: { ...data, shopId: actorId },
      update: { ...data, version: { increment: 1 } },
    });
  }

  private async issueAndStore(session: Session, actor: Admin | Shop): Promise<TokenPairResponse> {
    const actorId = session.adminId ?? session.shopId;
    if (!actorId) throw new UnauthorizedException('Некорректная сессия');

    const basePayload = {
      sub: actorId,
      actorType: session.actorType,
      sid: session.id,
      sv: session.version,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...basePayload, tokenType: 'access' } satisfies JwtPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtl,
      }),
      this.jwt.signAsync({ ...basePayload, tokenType: 'refresh' } satisfies JwtPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    const stored = await this.prisma.session.updateMany({
      where: { id: session.id, version: session.version, revokedAt: null },
      data: { refreshTokenHash: this.tokenHash(refreshToken) },
    });
    if (stored.count !== 1) {
      throw new UnauthorizedException('Сессия была заменена параллельным входом');
    }
    const isAdmin = session.actorType === ActorType.ADMIN;
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.accessTtl,
      user: {
        id: actor.id,
        actorType: session.actorType,
        name: actor.name,
        identifier: isAdmin ? (actor as Admin).email : (actor as Shop).login,
        ...(isAdmin ? { role: (actor as Admin).role } : {}),
      },
    };
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private pendingHash(): string {
    return createHash('sha256').update(`${Date.now()}:${Math.random()}`).digest('hex');
  }

  private hashesMatch(left: string, right: string): boolean {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
