import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [AuthModule],
  controllers: [ShopsController],
  providers: [ShopsService, AdminGuard],
})
export class ShopsModule {}
