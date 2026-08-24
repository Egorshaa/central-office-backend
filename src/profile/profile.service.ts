import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActorType } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeProfilePasswordDto } from './dto/change-profile-password.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  async changePassword(user: RequestUser, dto: ChangeProfilePasswordDto): Promise<void> {
    const actor =
      user.actorType === ActorType.ADMIN
        ? await this.prisma.admin.findUnique({ where: { id: user.id } })
        : await this.prisma.shop.findUnique({ where: { id: user.id } });
    if (!actor) throw new NotFoundException('Профиль не найден');
    if (!(await verifyPassword(dto.currentPassword, actor.passwordHash))) {
      throw new UnauthorizedException('Текущий пароль указан неверно');
    }

    const passwordHash = await hashPassword(dto.newPassword, this.config);
    if (user.actorType === ActorType.ADMIN) {
      await this.prisma.admin.update({ where: { id: user.id }, data: { passwordHash } });
    } else {
      await this.prisma.shop.update({ where: { id: user.id }, data: { passwordHash } });
    }
    await this.auth.revokeActorSession(user.actorType, user.id);
  }
}
