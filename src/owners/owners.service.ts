import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.shopOwner.findMany({
      include: { _count: { select: { shops: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const owner = await this.prisma.shopOwner.findUnique({
      where: { id },
      include: {
        shops: {
          select: { id: true, name: true, address: true, login: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!owner) throw new NotFoundException('Владелец не найден');
    return owner;
  }

  create(dto: CreateOwnerDto) {
    return this.prisma.shopOwner.create({ data: this.clean(dto) });
  }

  async update(id: string, dto: UpdateOwnerDto) {
    await this.ensureExists(id);
    return this.prisma.shopOwner.update({
      where: { id },
      data: this.clean(dto),
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    const shops = await this.prisma.shop.count({ where: { ownerId: id } });
    if (shops > 0) {
      throw new ConflictException('Нельзя удалить владельца, пока у него есть магазины');
    }
    await this.prisma.shopOwner.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    if (!(await this.prisma.shopOwner.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Владелец не найден');
    }
  }

  private clean<T extends CreateOwnerDto | UpdateOwnerDto>(dto: T): T {
    return Object.fromEntries(
      Object.entries(dto).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() || null : value,
      ]),
    ) as T;
  }
}
