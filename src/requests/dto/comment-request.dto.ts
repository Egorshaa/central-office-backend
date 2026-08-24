import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CommentRequestDto {
  @ApiProperty({ example: 'Проверить договор перед подключением' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;
}
