import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month?: number, year?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    return this.prisma.timeEntry.findMany({
      where: {
        project: { userId },
        startTime: { gte: from, lte: to },
      },
      include: {
        project: {
          select: {
            id: true, name: true, color: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async getSummaryByClient(userId: string, month: number, year: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        project: { userId },
        startTime: { gte: from, lte: to },
        billable: true,
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    const summary: Record<string, { clientName: string; hours: number; entries: number }> = {};

    for (const entry of entries) {
      const clientId = entry.project?.clientId || 'unknown';
      const clientName = entry.project?.client?.name || 'Bez klienta';
      if (!summary[clientId]) {
        summary[clientId] = { clientName, hours: 0, entries: 0 };
      }
      summary[clientId].hours += entry.duration / 3600;
      summary[clientId].entries++;
    }

    return Object.entries(summary).map(([clientId, data]) => ({
      clientId,
      ...data,
      hours: Math.round(data.hours * 100) / 100,
    }));
  }
}
