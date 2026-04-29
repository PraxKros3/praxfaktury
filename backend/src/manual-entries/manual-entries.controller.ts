import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManualEntriesService } from './manual-entries.service';
import { CreateManualEntryDto } from './dto/create-manual-entry.dto';

@ApiTags('Manual Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manual-entries')
export class ManualEntriesController {
  constructor(private service: ManualEntriesService) {}

  @ApiOperation({ summary: 'Zoznam manuálnych záznamov (zákaziek)' })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  @Get()
  findAll(
    @Request() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findAll(
      req.user.id,
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }

  @ApiOperation({ summary: 'Vytvoriť manuálny záznam (zákazku)' })
  @Post()
  create(@Request() req: any, @Body() dto: CreateManualEntryDto) {
    return this.service.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Upraviť manuálny záznam' })
  @Patch(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: Partial<CreateManualEntryDto>) {
    return this.service.update(req.user.id, id, dto);
  }

  @ApiOperation({ summary: 'Zmazať manuálny záznam' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(req.user.id, id);
  }
}
