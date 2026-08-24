import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeAdminPasswordDto {
  @ApiProperty({ minLength: 8, example: 'NewManagerPass1!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
