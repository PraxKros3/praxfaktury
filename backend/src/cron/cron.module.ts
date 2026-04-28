import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { TogglModule } from '../toggl/toggl.module';
import { KrosModule } from '../kros/kros.module';

@Module({
  imports: [InvoicesModule, TogglModule, KrosModule],
  providers: [CronService],
})
export class CronModule {}
