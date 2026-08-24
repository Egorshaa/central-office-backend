import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminsService } from './admins.service';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@ApiTags('Администраторы')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  @ApiOperation({ summary: 'Список администраторов' })
  findAll() {
    return this.admins.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(AdminRole.ROOT)
  @ApiOperation({ summary: 'Создать manager (только root)' })
  create(@Body() dto: CreateAdminDto) {
    return this.admins.createManager(dto);
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.ROOT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Сменить пароль manager и завершить его сессию' })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeAdminPasswordDto,
  ): Promise<void> {
    await this.admins.changePassword(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.ROOT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить manager (только root)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.admins.remove(id);
  }
}
