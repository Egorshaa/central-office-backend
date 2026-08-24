import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { ShopGuard } from '../common/guards/shop.guard';
import { TerminalsController } from './terminals.controller';
import { TerminalsService } from './terminals.service';

@Module({
  imports: [AuthModule],
  controllers: [TerminalsController],
  providers: [TerminalsService, AdminGuard, ShopGuard],
})
export class TerminalsModule {}
