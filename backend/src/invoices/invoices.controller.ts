import {
  Controller, Get, Post, Delete, Patch,
  Param, Query, Body, UseGuards, Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoicesService } from './invoices.service';
import { KrosService } from '../kros/kros.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoices: InvoicesService,
    private kros: KrosService,
  ) {}

  @ApiOperation({ summary: 'Zoznam faktúr (stránkovaný)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.invoices.findAll(req.user.id, +page, +limit);
  }

  @ApiOperation({ summary: 'Štatistiky faktúr (celková suma, počty)' })
  @Get('stats')
  stats(@Request() req: any) {
    return this.invoices.getStats(req.user.id);
  }

  @ApiOperation({ summary: 'Mesačné zárobky za rok' })
  @ApiQuery({ name: 'year', required: false, example: '2026' })
  @Get('monthly-earnings')
  monthlyEarnings(
    @Request() req: any,
    @Query('year') year?: string,
  ) {
    const y = year ? +year : new Date().getFullYear();
    return this.invoices.getMonthlyEarnings(req.user.id, y);
  }

  @ApiOperation({ summary: 'Detail faktúry' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.invoices.findOne(req.user.id, id);
  }

  @ApiOperation({ summary: 'Vygenerovať faktúru za obdobie' })
  @Post('generate')
  generate(
    @Request() req: any,
    @Body() body: { year?: number; month?: number },
  ) {
    const now = new Date();
    const year = body.year ?? now.getFullYear();
    const month = body.month ?? now.getMonth();
    return this.invoices.generateForPeriod(req.user.id, year, month);
  }

  @ApiOperation({ summary: 'Odoslať faktúru cez KROS' })
  @Post(':id/send')
  send(@Param('id') id: string, @Request() req: any) {
    return this.kros.sendInvoice(req.user.id, id);
  }

  @ApiOperation({ summary: 'Zmeniť stav faktúry' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.invoices.updateStatus(req.user.id, id, status);
  }

  @ApiOperation({ summary: 'Zmazať faktúru' })
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.invoices.delete(req.user.id, id);
  }
}
