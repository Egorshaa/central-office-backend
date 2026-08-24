import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActorType, AdminRole, Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { hashPassword } from '../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdminSelect;

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  findAll() {
    return this.prisma.admin.findMany({
      select: adminSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createManager(dto: CreateAdminDto) {
    const admin = await this.prisma.admin.create({
      data: {
        name: dto.name.trim(),
        email: dto.email,
        passwordHash: await hashPassword(dto.password, this.config),
        role: AdminRole.MANAGER,
        rootKey: null,
      },
      select: adminSelect,
    });
    return admin;
  }

  async changePassword(id: string, dto: ChangeAdminPasswordDto): Promise<void> {
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Администратор не найден');
    if (target.role === AdminRole.ROOT) {
      throw new ForbiddenException('Пароль root изменяется только через /profile/password');
    }

    await this.prisma.admin.update({
      where: { id },
      data: { passwordHash: await hashPassword(dto.password, this.config) },
    });
    await this.auth.revokeActorSession(ActorType.ADMIN, id);
  }

  async remove(id: string): Promise<void> {
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Администратор не найден');
    if (target.role === AdminRole.ROOT) throw new ForbiddenException('Root нельзя удалить');

    await this.auth.revokeActorSession(ActorType.ADMIN, id);
    await this.prisma.admin.delete({ where: { id } });
  }
}
