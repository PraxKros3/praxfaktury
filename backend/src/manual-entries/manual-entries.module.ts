import { Module } from '@nestjs/common';
import { ManualEntriesController } from './manual-entries.controller';
import { ManualEntriesService } from './manual-entries.service';

@Module({
  controllers: [ManualEntriesController],
  providers: [ManualEntriesService],
  exports: [ManualEntriesService],
})
export class ManualEntriesModule {}
