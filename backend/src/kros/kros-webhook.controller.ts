import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { KrosService } from './kros.service';

@ApiTags('Webhooks')
@Controller('webhooks/kros')
export class KrosWebhookController {
  private readonly logger = new Logger(KrosWebhookController.name);

  constructor(
    private kros: KrosService,
    private config: ConfigService,
  ) {}

  @ApiOperation({ summary: 'KROS webhook — aktualizácia stavu faktúry' })
  @Post()
  @HttpCode(200)
  async handle(@Body() body: any, @Headers('x-kros-signature-256') signature?: string) {
    const secret = this.config.get('KROS_WEBHOOK_SECRET');
    if (secret && signature) {
      const expected = createHmac('sha256', Buffer.from(secret, 'utf16le'))
        .update(JSON.stringify(body), 'utf16le')
        .digest('base64');
      if (expected !== signature) {
        this.logger.warn('Invalid KROS webhook signature');
        return { ok: false };
      }
    }

    await this.kros.handleWebhook(body);
    return { ok: true };
  }
}
