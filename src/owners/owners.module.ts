import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';

@Module({
  imports: [AuthModule],
  controllers: [OwnersController],
  providers: [OwnersService, AdminGuard],
})
export class OwnersModule {}
