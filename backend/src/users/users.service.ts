import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        togglApiToken: true,
        togglWorkspaceId: true,
        krosApiToken: true,
        defaultHourlyRate: true,
        defaultVatRate: true,
        currency: true,
        invoiceDueDays: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Používateľ neexistuje');
    return user;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        togglApiToken: true,
        togglWorkspaceId: true,
        krosApiToken: true,
        defaultHourlyRate: true,
        defaultVatRate: true,
        currency: true,
        invoiceDueDays: true,
      },
    });
  }

  async ensureDefaultUser() {
    const existing = await this.prisma.user.findFirst();
    if (!existing) {
      const hashed = await bcrypt.hash('admin123', 10);
      return this.prisma.user.create({
        data: { email: 'admin@nif.local', password: hashed },
      });
    }
    return existing;
  }
}
