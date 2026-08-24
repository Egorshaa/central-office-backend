import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRequestDto {
  @ApiPropertyOptional({ example: 'MAC-адрес указан неверно' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}
