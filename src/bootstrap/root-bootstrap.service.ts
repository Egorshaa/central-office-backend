import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/utils/password.util';

@Injectable()
export class RootBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RootBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.prisma.admin.findFirst({ where: { role: AdminRole.ROOT } });
    if (existing) {
      if (!existing.rootKey) {
        await this.prisma.admin.update({
          where: { id: existing.id },
          data: { rootKey: 'ROOT' },
        });
      }
      return;
    }

    const password = this.config.getOrThrow<string>('ROOT_PASSWORD');
    if (password.length < 8) throw new Error('ROOT_PASSWORD must contain at least 8 characters');

    try {
      const root = await this.prisma.admin.create({
        data: {
          name: this.config.getOrThrow<string>('ROOT_NAME'),
          email: this.config.getOrThrow<string>('ROOT_EMAIL'),
          passwordHash: await hashPassword(password, this.config),
          role: AdminRole.ROOT,
          rootKey: 'ROOT',
        },
      });
      this.logger.log(`Initial root account created: ${root.email}`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.log('Root was created by another application instance');
        return;
      }
      throw error;
    }
  }
}
