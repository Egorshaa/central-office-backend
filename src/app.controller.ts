import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Система')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Redirect('/docs', 302)
  @ApiOperation({ summary: 'Перенаправление на Swagger' })
  openDocs(): { url: string } {
    return { url: '/docs' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка состояния API и PostgreSQL' })
  async health(): Promise<{
    status: 'ok';
    database: 'up';
    version: 'clean-v4';
    timestamp: string;
  }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'up',
      version: 'clean-v4',
      timestamp: new Date().toISOString(),
    };
  }
}
