import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActorType, Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { hashPassword } from '../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopCredentialsDto } from './dto/update-shop-credentials.dto';

const shopSelect = {
  id: true,
  ownerId: true,
  name: true,
  legalName: true,
  taxId: true,
  registrationNumber: true,
  address: true,
  phone: true,
  email: true,
  requisites: true,
  login: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShopSelect;

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  findAll() {
    return this.prisma.shop.findMany({
      select: {
        ...shopSelect,
        owner: { select: { id: true, name: true } },
        _count: { select: { terminals: true, requests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: {
        ...shopSelect,
        owner: true,
        terminals: { orderBy: { createdAt: 'desc' } },
        _count: { select: { requests: true } },
      },
    });
    if (!shop) throw new NotFoundException('Магазин не найден');
    return shop;
  }

  async create(dto: CreateShopDto) {
    const owner = await this.prisma.shopOwner.findUnique({
      where: { id: dto.ownerId },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('Владелец не найден');

    const shop = await this.prisma.shop.create({
      data: {
        ownerId: dto.ownerId,
        name: dto.name.trim(),
        legalName: dto.legalName?.trim(),
        taxId: dto.taxId?.trim(),
        registrationNumber: dto.registrationNumber?.trim(),
        address: dto.address.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        requisites: dto.requisites as Prisma.InputJsonValue | undefined,
        login: dto.login,
        passwordHash: await hashPassword(dto.password, this.config),
      },
      select: shopSelect,
    });
    return shop;
  }

  async updateCredentials(id: string, dto: UpdateShopCredentialsDto): Promise<void> {
    if (dto.login === undefined && dto.password === undefined) {
      throw new BadRequestException('Передайте новый login и/или password');
    }
    if (!(await this.prisma.shop.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Магазин не найден');
    }

    await this.prisma.shop.update({
      where: { id },
      data: {
        ...(dto.login !== undefined ? { login: dto.login } : {}),
        ...(dto.password !== undefined
          ? { passwordHash: await hashPassword(dto.password, this.config) }
          : {}),
      },
    });
    await this.auth.revokeActorSession(ActorType.SHOP, id);
  }
}
