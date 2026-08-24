import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActorType, Prisma, RequestStatus, TerminalStatus } from '@prisma/client';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { normalizeMacAddress } from '../common/utils/mac-address.util';
import { PrismaService } from '../prisma/prisma.service';
import { CommentRequestDto } from './dto/comment-request.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.connectionRequest.findMany({
      include: {
        shop: { select: { id: true, name: true, address: true } },
        terminal: true,
        comments: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async create(user: RequestUser, dto: CreateRequestDto) {
    const shopId = user.actorType === ActorType.SHOP ? user.id : dto.shopId;
    if (!shopId) throw new BadRequestException('Администратор должен передать shopId');
    if (!(await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } }))) {
      throw new NotFoundException('Магазин не найден');
    }

    const macAddress = normalizeMacAddress(dto.macAddress);
    const [terminal, pending] = await Promise.all([
      this.prisma.terminal.findUnique({ where: { macAddress }, select: { id: true } }),
      this.prisma.connectionRequest.findFirst({
        where: { macAddress, status: RequestStatus.PENDING },
        select: { id: true },
      }),
    ]);
    if (terminal) throw new ConflictException('Терминал с таким MAC уже зарегистрирован');
    if (pending) throw new ConflictException('Заявка с таким MAC уже находится на рассмотрении');

    const request = await this.prisma.connectionRequest.create({
      data: {
        shopId,
        macAddress,
        comment: dto.comment?.trim(),
      },
      include: { shop: { select: { id: true, name: true } } },
    });
    return request;
  }

  async approve(id: string) {
    const result = await this.prisma.$transaction(
      async (transaction) => {
        const request = await transaction.connectionRequest.findUnique({ where: { id } });
        if (!request) throw new NotFoundException('Заявка не найдена');
        if (request.status !== RequestStatus.PENDING) {
          throw new ConflictException('Решение по заявке уже принято');
        }
        if (await transaction.terminal.findUnique({ where: { macAddress: request.macAddress } })) {
          throw new ConflictException('Терминал с таким MAC уже существует');
        }

        const decision = await transaction.connectionRequest.updateMany({
          where: { id, status: RequestStatus.PENDING },
          data: { status: RequestStatus.APPROVED, decidedAt: new Date() },
        });
        if (decision.count !== 1) {
          throw new ConflictException('Решение по заявке уже принято');
        }
        const terminal = await transaction.terminal.create({
          data: {
            macAddress: request.macAddress,
            shopId: request.shopId,
            connectionRequestId: request.id,
            status: TerminalStatus.INACTIVE,
          },
        });
        const updatedRequest = await transaction.connectionRequest.findUniqueOrThrow({
          where: { id },
        });
        return { request: updatedRequest, terminal };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return result;
  }

  async reject(id: string, dto: RejectRequestDto, user: RequestUser) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const request = await transaction.connectionRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Заявка не найдена');
      if (request.status !== RequestStatus.PENDING) {
        throw new ConflictException('Решение по заявке уже принято');
      }

      const comment = dto.comment?.trim();
      const decision = await transaction.connectionRequest.updateMany({
        where: { id, status: RequestStatus.PENDING },
        data: {
          status: RequestStatus.REJECTED,
          decidedAt: new Date(),
          ...(comment ? { comment } : {}),
        },
      });
      if (decision.count !== 1) {
        throw new ConflictException('Решение по заявке уже принято');
      }
      if (comment) {
        await transaction.requestComment.create({
          data: { requestId: id, authorId: user.id, text: comment },
        });
      }
      return transaction.connectionRequest.findUniqueOrThrow({ where: { id } });
    });
    return result;
  }

  async addComment(id: string, dto: CommentRequestDto, user: RequestUser) {
    const text = dto.text.trim();
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!request) throw new NotFoundException('Заявка не найдена');

    const comment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.requestComment.create({
        data: { requestId: id, authorId: user.id, text },
        include: { author: { select: { id: true, name: true, email: true } } },
      });
      await transaction.connectionRequest.update({ where: { id }, data: { comment: text } });
      return created;
    });
    return comment;
  }
}
