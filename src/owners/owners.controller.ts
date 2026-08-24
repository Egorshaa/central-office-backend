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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { OwnersService } from './owners.service';

@ApiTags('Владельцы магазинов')
@ApiBearerAuth()
@Controller('shops-owners')
@UseGuards(JwtAuthGuard, AdminGuard)
export class OwnersController {
  constructor(private readonly owners: OwnersService) {}

  @Get()
  @ApiOperation({ summary: 'Список владельцев' })
  findAll() {
    return this.owners.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Карточка владельца' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.owners.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать владельца' })
  create(@Body() dto: CreateOwnerDto) {
    return this.owners.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить владельца' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOwnerDto) {
    return this.owners.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить владельца без магазинов' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.owners.remove(id);
  }
}
