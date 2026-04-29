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

      const [entries, manualEntries] = await Promise.all([
        projectIds.length
          ? this.prisma.timeEntry.findMany({
              where: {
                projectId: { in: projectIds },
                startTime: { gte: periodFrom, lte: periodTo },
                billable: true,
                invoiced: false,
              },
            })
          : this.prisma.timeEntry.findMany({ where: { id: 'none' } }),
        this.prisma.manualEntry.findMany({
          where: {
            clientId: client.id,
            performedAt: { gte: periodFrom, lte: periodTo },
            invoiced: false,
          },
        }),
      ]);

      if (!entries.length && !manualEntries.length) continue;

      const hourlyRate = client.hourlyRate ?? user.defaultHourlyRate;
      if (!hourlyRate) continue;

      const togglSeconds = entries.reduce((sum, e) => sum + e.duration, 0);
      const togglHours = new Decimal(togglSeconds / 3600).toDecimalPlaces(2);
      const manualHours = manualEntries
        .reduce((sum, e) => sum.plus(e.hours), new Decimal(0))
        .toDecimalPlaces(2);
      const totalHours = togglHours.plus(manualHours).toDecimalPlaces(2);

      const togglSubtotal = togglHours.mul(hourlyRate).toDecimalPlaces(2);
      const manualSubtotal = manualEntries
        .reduce((sum, e) => sum.plus(new Decimal(e.hours.toString()).mul(e.hourlyRate.toString())), new Decimal(0))
        .toDecimalPlaces(2);
      const subtotal = togglSubtotal.plus(manualSubtotal).toDecimalPlaces(2);

      const vatRate = user.defaultVatRate;
      const vatAmount = subtotal.mul(vatRate).div(100).toDecimalPlaces(2);
      const total = subtotal.plus(vatAmount).toDecimalPlaces(2);

      const issueDate = new Date(year, month, 1);
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + user.invoiceDueDays);

      const invoiceItems: any[] = [];
      if (togglHours.greaterThan(0)) {
        invoiceItems.push({
          description: `Programátorské práce ${month}/${year}`,
          quantity: togglHours,
          unit: 'hod',
          unitPrice: hourlyRate,
          total: togglSubtotal,
        });
      }
      for (const me of manualEntries) {
        const meTotal = new Decimal(me.hours.toString()).mul(me.hourlyRate.toString()).toDecimalPlaces(2);
        invoiceItems.push({
          description: me.serviceName + (me.notes ? ` — ${me.notes}` : ''),
          quantity: me.hours,
          unit: 'hod',
          unitPrice: me.hourlyRate,
          total: meTotal,
        });
      }

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
          items: { create: invoiceItems },
        },
      });

      await Promise.all([
        entries.length
          ? this.prisma.timeEntry.updateMany({
              where: { id: { in: entries.map((e) => e.id) } },
              data: { invoiced: true, invoiceId: invoice.id },
            })
          : Promise.resolve(),
        manualEntries.length
          ? this.prisma.manualEntry.updateMany({
              where: { id: { in: manualEntries.map((e) => e.id) } },
              data: { invoiced: true, invoiceId: invoice.id },
            })
          : Promise.resolve(),
      ]);

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
