import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';

@ApiTags('Time Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private timeEntries: TimeEntriesService) {}

  @ApiOperation({ summary: 'Zoznam časových záznamov' })
  @ApiQuery({ name: 'month', required: false, example: '4' })
  @ApiQuery({ name: 'year', required: false, example: '2026' })
  @Get()
  findAll(
    @Request() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.timeEntries.findAll(req.user.id, month ? +month : undefined, year ? +year : undefined);
  }

  @ApiOperation({ summary: 'Súhrn hodín podľa klienta za mesiac' })
  @ApiQuery({ name: 'month', required: false, example: '4' })
  @ApiQuery({ name: 'year', required: false, example: '2026' })
  @Get('summary')
  summary(
    @Request() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    return this.timeEntries.getSummaryByClient(
      req.user.id,
      month ? +month : now.getMonth() + 1,
      year ? +year : now.getFullYear(),
    );
  }
}
