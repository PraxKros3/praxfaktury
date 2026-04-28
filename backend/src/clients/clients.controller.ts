import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientsService } from './clients.service';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @ApiOperation({ summary: 'Zoznam všetkých klientov' })
  @Get()
  findAll(@Request() req: any) {
    return this.clients.findAll(req.user.id);
  }

  @ApiOperation({ summary: 'Detail klienta' })
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.clients.findOne(req.user.id, id);
  }

  @ApiOperation({ summary: 'Vytvoriť klienta' })
  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.clients.create(req.user.id, body);
  }

  @ApiOperation({ summary: 'Upraviť klienta' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.clients.update(req.user.id, id, body);
  }

  @ApiOperation({ summary: 'Zmazať klienta' })
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.clients.remove(req.user.id, id);
  }
}
