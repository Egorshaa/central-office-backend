import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TerminalStatus } from '@prisma/client';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { normalizeMacAddress } from '../common/utils/mac-address.util';
import { PrismaService } from '../prisma/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { UpdateTerminalStatusDto } from './dto/update-terminal-status.dto';

@Injectable()
export class TerminalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.terminal.findMany({
      include: { shop: { select: { id: true, name: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const terminal = await this.prisma.terminal.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, name: true, address: true, ownerId: true } },
        connectionRequest: { include: { comments: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!terminal) throw new NotFoundException('Терминал не найден');
    return terminal;
  }

  async updateStatus(id: string, dto: UpdateTerminalStatusDto) {
    if (!(await this.prisma.terminal.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Терминал не найден');
    }
    const terminal = await this.prisma.terminal.update({
      where: { id },
      data: { status: dto.status },
    });
    return terminal;
  }

  async heartbeat(user: RequestUser, dto: HeartbeatDto) {
    const macAddress = normalizeMacAddress(dto.macAddress);
    const terminal = await this.prisma.terminal.findUnique({ where: { macAddress } });
    if (!terminal) throw new NotFoundException('Терминал с таким MAC-адресом не зарегистрирован');
    if (terminal.shopId !== user.id) {
      throw new ForbiddenException('Терминал принадлежит другому магазину');
    }

    const updated = await this.prisma.terminal.update({
      where: { id: terminal.id },
      data: { status: TerminalStatus.ACTIVE, lastSeenAt: new Date() },
    });
    return updated;
  }
}
