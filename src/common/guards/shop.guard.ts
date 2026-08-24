import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import type { Request } from 'express';
import { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class ShopGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (request.user?.actorType !== ActorType.SHOP) {
      throw new ForbiddenException('Доступ разрешён только торговым точкам');
    }
    return true;
  }
}
