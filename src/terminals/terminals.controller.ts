import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { ShopGuard } from '../common/guards/shop.guard';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { UpdateTerminalStatusDto } from './dto/update-terminal-status.dto';
import { TerminalsService } from './terminals.service';

@ApiTags('Терминалы')
@ApiBearerAuth()
@Controller('terminals')
export class TerminalsController {
  constructor(private readonly terminals: TerminalsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Список терминалов' })
  findAll() {
    return this.terminals.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Карточка терминала' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.terminals.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Обновить статус вручную' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTerminalStatusDto) {
    return this.terminals.updateStatus(id, dto);
  }

  @Post('alive')
  @UseGuards(JwtAuthGuard, ShopGuard)
  @ApiOperation({ summary: 'Heartbeat терминала (JWT магазина)' })
  heartbeat(@CurrentUser() user: RequestUser, @Body() dto: HeartbeatDto) {
    return this.terminals.heartbeat(user, dto);
  }
}
