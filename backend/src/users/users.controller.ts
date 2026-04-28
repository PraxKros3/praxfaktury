import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @ApiOperation({ summary: 'Profil prihláseneho používateľa' })
  @Get('me')
  getMe(@Request() req: any) {
    return this.users.findById(req.user.id);
  }

  @ApiOperation({ summary: 'Uložiť nastavenia (API tokeny, sadzby)' })
  @Patch('settings')
  updateSettings(@Request() req: any, @Body() dto: UpdateSettingsDto) {
    return this.users.updateSettings(req.user.id, dto);
  }
}
