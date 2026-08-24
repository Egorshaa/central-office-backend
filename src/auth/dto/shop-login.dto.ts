import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ShopLoginDto {
  @ApiProperty({ example: 'shop-001' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  login!: string;

  @ApiProperty({ example: 'StrongShopPassword1!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
