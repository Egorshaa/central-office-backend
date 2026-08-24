import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopCredentialsDto } from './dto/update-shop-credentials.dto';
import { ShopsService } from './shops.service';

@ApiTags('Магазины')
@ApiBearerAuth()
@Controller('shops')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get()
  @ApiOperation({ summary: 'Список магазинов' })
  findAll() {
    return this.shops.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Карточка магазина' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shops.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать магазин' })
  create(@Body() dto: CreateShopDto) {
    return this.shops.create(dto);
  }

  @Patch(':id/credentials')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Изменить логин/пароль и завершить сессию магазина' })
  async updateCredentials(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopCredentialsDto,
  ): Promise<void> {
    await this.shops.updateCredentials(id, dto);
  }
}
