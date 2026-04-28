import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KrosService } from './kros.service';
import { KrosController } from './kros.controller';
import { KrosWebhookController } from './kros-webhook.controller';

@Module({
  imports: [HttpModule],
  controllers: [KrosController, KrosWebhookController],
  providers: [KrosService],
  exports: [KrosService],
})
export class KrosModule {}
