import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KrosService } from './kros.service';

@ApiTags('KROS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kros')
export class KrosController {
  constructor(private kros: KrosService) {}

  @ApiOperation({ summary: 'Odoslať faktúru do KROS OpenAPI' })
  @Post('invoices/:id/send')
  sendInvoice(@Param('id') id: string, @Request() req: any) {
    return this.kros.sendInvoice(req.user.id, id);
  }
}
