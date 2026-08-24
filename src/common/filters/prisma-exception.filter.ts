import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    let mapped: HttpException;

    switch (exception.code) {
      case 'P2002':
        mapped = new ConflictException('Запись с такими уникальными данными уже существует');
        break;
      case 'P2003':
        mapped = new ConflictException('Операция нарушает связь между сущностями');
        break;
      case 'P2025':
        mapped = new NotFoundException('Запись не найдена');
        break;
      default:
        mapped = new ConflictException('Операция с базой данных не выполнена');
    }

    const response = host.switchToHttp().getResponse<Response>();
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }
}
