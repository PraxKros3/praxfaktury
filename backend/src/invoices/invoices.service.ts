import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId },
        include: { client: { select: { id: true, name: true } }, items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { client: true, items: true, timeEntries: true },
    });
    if (!invoice) throw new NotFoundException('Faktúra neexistuje');
    return invoice;
  }

  async generateForPeriod(userId: string, year: number, month: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Používateľ neexistuje');

    const periodFrom = new Date(year, month - 1, 1);
    const periodTo = new Date(year, month, 0, 23, 59, 59);

    const clients = await this.prisma.client.findMany({
      where: { userId, active: true },
      include: { projects: true },
    });

    const created: string[] = [];

    for (const client of clients) {
      const projectIds = client.projects.map((p) => p.id);
      if (!projectIds.length) continue;

      const entries = await this.prisma.timeEntry.findMany({
        where: {
          projectId: { in: projectIds },
          startTime: { gte: periodFrom, lte: periodTo },
          billable: true,
          invoiced: false,
        },
      });

      if (!entries.length) continue;

      const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);
      const totalHours = new Decimal(totalSeconds / 3600).toDecimalPlaces(2);

      const hourlyRate = client.hourlyRate ?? user.defaultHourlyRate;
      if (!hourlyRate) continue;

      const subtotal = totalHours.mul(hourlyRate).toDecimalPlaces(2);
      const vatRate = user.defaultVatRate;
      const vatAmount = subtotal.mul(vatRate).div(100).toDecimalPlaces(2);
      const total = subtotal.plus(vatAmount).toDecimalPlaces(2);

      const issueDate = new Date(year, month, 1);
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + user.invoiceDueDays);

      const invoice = await this.prisma.invoice.create({
        data: {
          userId,
          clientId: client.id,
          status: 'DRAFT',
          periodFrom,
          periodTo,
          issueDate,
          dueDate,
          totalHours,
          hourlyRate,
          subtotal,
          vatRate,
          vatAmount,
          total,
          currency: user.currency,
          items: {
            create: [
              {
                description: `Programátorské práce ${month}/${year}`,
                quantity: totalHours,
                unit: 'hod',
                unitPrice: hourlyRate,
                total: subtotal,
              },
            ],
          },
        },
      });

      await this.prisma.timeEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { invoiced: true, invoiceId: invoice.id },
      });

      created.push(invoice.id);
    }

    return { generated: created.length, invoiceIds: created };
  }

  async getStats(userId: string) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allInvoices, yearInvoices, monthInvoices, statusCounts] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { userId },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { userId, issueDate: { gte: startOfYear } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { userId, issueDate: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      total: { amount: allInvoices._sum.total || 0, count: allInvoices._count },
      year: { amount: yearInvoices._sum.total || 0, count: yearInvoices._count },
      month: { amount: monthInvoices._sum.total || 0, count: monthInvoices._count },
      byStatus: statusCounts.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>,
      ),
    };
  }

  async getMonthlyEarnings(userId: string, year: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        issueDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
        status: { in: ['SENT', 'PAID'] },
      },
      select: { issueDate: true, total: true },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: 0,
    }));

    for (const inv of invoices) {
      const m = inv.issueDate.getMonth();
      monthly[m].amount += Number(inv.total);
    }

    return monthly;
  }

  async updateStatus(userId: string, id: string, status: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, userId } });
    if (!invoice) throw new NotFoundException('Faktúra neexistuje');
    return this.prisma.invoice.update({ where: { id }, data: { status: status as any } });
  }

  async delete(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, userId } });
    if (!invoice) throw new NotFoundException('Faktúra neexistuje');
    if (invoice.status === 'SENT' || invoice.status === 'PAID') {
      throw new BadRequestException('Odoslanú alebo zaplatenú faktúru nemožno zmazať');
    }
    await this.prisma.timeEntry.updateMany({
      where: { invoiceId: id },
      data: { invoiced: false, invoiceId: null },
    });
    return this.prisma.invoice.delete({ where: { id } });
  }
}
