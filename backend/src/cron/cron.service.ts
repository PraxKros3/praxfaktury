import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TogglService } from '../toggl/toggl.service';
import { InvoicesService } from '../invoices/invoices.service';
import { KrosService } from '../kros/kros.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private toggl: TogglService,
    private invoices: InvoicesService,
    private kros: KrosService,
  ) {}

  // Sync Toggl every 6 hours
  @Cron('0 */6 * * *')
  async syncToggl() {
    this.logger.log('Running scheduled Toggl sync');
    const users = await this.prisma.user.findMany({
      where: { togglApiToken: { not: null }, togglWorkspaceId: { not: null } },
    });
    for (const user of users) {
      await this.toggl.syncAll(user.id).catch((e) =>
        this.logger.error(`Toggl sync failed for ${user.id}: ${e.message}`),
      );
    }
  }

  // Generate and send invoices on the 1st of each month at 07:00
  @Cron('0 7 1 * *')
  async monthlyInvoicing() {
    this.logger.log('Running monthly invoice generation');
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const users = await this.prisma.user.findMany({
      where: { krosApiToken: { not: null } },
    });

    for (const user of users) {
      try {
        const result = await this.invoices.generateForPeriod(user.id, year, prevMonth);
        this.logger.log(`Generated ${result.generated} invoices for user ${user.id}`);

        // Auto-send to KROS
        for (const invoiceId of result.invoiceIds) {
          await this.kros.sendInvoice(user.id, invoiceId).catch((e) =>
            this.logger.error(`KROS send failed for invoice ${invoiceId}: ${e.message}`),
          );
        }
      } catch (e: any) {
        this.logger.error(`Monthly invoicing failed for ${user.id}: ${e.message}`);
      }
    }
  }
}
