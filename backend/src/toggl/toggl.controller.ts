import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TogglService } from './toggl.service';

@ApiTags('Toggl')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toggl')
export class TogglController {
  constructor(private toggl: TogglService) {}

  @ApiOperation({ summary: 'Synchronizovať klientov, projekty a časové záznamy z Toggl' })
  @Post('sync')
  sync(@Request() req: any) {
    return this.toggl.syncAll(req.user.id);
  }

  @ApiOperation({ summary: 'Zoznam workspaces z Toggl' })
  @Get('workspaces')
  async workspaces(@Request() req: any) {
    const user = req.user;
    if (!user.togglApiToken) return [];
    return this.toggl.getWorkspaces(user.togglApiToken);
  }
}
