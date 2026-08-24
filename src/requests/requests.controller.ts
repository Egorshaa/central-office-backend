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
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CommentRequestDto } from './dto/comment-request.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { RequestsService } from './requests.service';

@ApiTags('Заявки на подключение')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Список заявок' })
  findAll() {
    return this.requests.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Создать заявку (дополнительная ручка для полного сценария)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRequestDto) {
    return this.requests.create(user, dto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Одобрить заявку и атомарно создать терминал' })
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.requests.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Отклонить заявку' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.requests.reject(id, dto, user);
  }

  @Post(':id/comment')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Добавить комментарий к заявке' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommentRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.requests.addComment(id, dto, user);
  }
}
