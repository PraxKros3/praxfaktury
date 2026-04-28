import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @ApiOperation({ summary: 'Zoznam projektov (po Toggl sync)' })
  @Get()
  findAll(@Request() req: any) {
    return this.projects.findAll(req.user.id);
  }

  @ApiOperation({ summary: 'Upraviť projekt (hodinová sadzba, farba)' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.projects.update(req.user.id, id, body);
  }
}
