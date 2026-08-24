import { Module } from '@nestjs/common';
import { RootBootstrapService } from './root-bootstrap.service';

@Module({ providers: [RootBootstrapService] })
export class BootstrapModule {}
