import { Body, Controller, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { ChangeProfilePasswordDto } from './dto/change-profile-password.dto';
import { ProfileService } from './profile.service';

@ApiTags('Профиль')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Сменить свой пароль и завершить текущую сессию' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangeProfilePasswordDto,
  ): Promise<void> {
    await this.profile.changePassword(user, dto);
  }
}
