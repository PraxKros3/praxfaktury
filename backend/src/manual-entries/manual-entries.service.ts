import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualEntryDto } from './dto/create-manual-entry.dto';

@Injectable()
export class ManualEntriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month?: number, year?: number) {
    const where: any = { userId };
    if (month && year) {
      where.performedAt = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59),
      };
    }
    return this.prisma.manualEntry.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { performedAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateManualEntryDto) {
    return this.prisma.manualEntry.create({
      data: {
        userId,
        serviceName: dto.serviceName,
        hourlyRate: dto.hourlyRate,
        performedAt: new Date(dto.performedAt),
        hours: dto.hours,
        notes: dto.notes,
        clientId: dto.clientId || null,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateManualEntryDto>) {
    const entry = await this.prisma.manualEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Záznam neexistuje');
    return this.prisma.manualEntry.update({
      where: { id },
      data: {
        ...(dto.serviceName && { serviceName: dto.serviceName }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
        ...(dto.performedAt && { performedAt: new Date(dto.performedAt) }),
        ...(dto.hours !== undefined && { hours: dto.hours }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId || null }),
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(userId: string, id: string) {
    const entry = await this.prisma.manualEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Záznam neexistuje');
    return this.prisma.manualEntry.delete({ where: { id } });
  }
}
