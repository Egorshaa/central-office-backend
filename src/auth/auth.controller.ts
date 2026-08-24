import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { AuthService, TokenPairResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ShopLoginDto } from './dto/shop-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход администратора по email и паролю' })
  login(@Body() dto: LoginDto): Promise<TokenPairResponse> {
    return this.auth.loginAdmin(dto);
  }

  @Post('shop/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход торговой точки по логину и паролю' })
  shopLogin(@Body() dto: ShopLoginDto): Promise<TokenPairResponse> {
    return this.auth.loginShop(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ротация пары access/refresh JWT' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершение текущей сессии' })
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    await this.auth.logout(user);
  }
}
