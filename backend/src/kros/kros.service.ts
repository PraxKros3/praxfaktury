import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Invoice } from '@prisma/client';

const KROS_BASE = 'https://api-economy.kros.sk/api';

@Injectable()
export class KrosService {
  private readonly logger = new Logger(KrosService.name);

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
  ) {}

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async sendInvoice(userId: string, invoiceId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.krosApiToken) {
      throw new BadRequestException('KROS API token nie je nastavený');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, items: true },
    });
    if (!invoice) throw new BadRequestException('Faktúra neexistuje');

    const payload = this.buildKrosPayload(invoice);

    const { data, headers } = await firstValueFrom(
      this.http.post(`${KROS_BASE}/invoices`, [payload], {
        headers: this.headers(user.krosApiToken),
      }),
    );

    const requestId = headers['x-request-id'] || data?.requestId;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PROCESSING',
        krosRequestId: requestId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'INVOICE_SENT_TO_KROS',
        entity: 'Invoice',
        entityId: invoiceId,
        metadata: { requestId, krosResponse: data },
      },
    });

    this.logger.log(`Invoice ${invoiceId} sent to KROS, requestId: ${requestId}`);
    return { requestId, status: 'PROCESSING' };
  }

  private buildKrosPayload(invoice: Invoice & { client: any; items: any[] }) {
    return {
      documentNumber: '',
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      deliveryDate: invoice.periodTo.toISOString().split('T')[0],
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      variableSymbol: '',
      subscriber: {
        name: invoice.client.name,
        email: invoice.client.email || '',
        ico: invoice.client.ico || '',
        dic: invoice.client.dic || '',
        icDph: invoice.client.icDph || '',
        address: {
          street: invoice.client.address || '',
          city: invoice.client.city || '',
          zipCode: invoice.client.zipCode || '',
          country: invoice.client.country || 'SK',
        },
      },
      items: invoice.items.map((item) => ({
        name: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(invoice.vatRate),
      })),
      currency: invoice.currency,
      note: invoice.notes || '',
    };
  }

  async handleWebhook(payload: any) {
    const { requestId, documents } = payload;
    if (!requestId || !documents?.length) return;

    for (const doc of documents) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { krosRequestId: requestId },
      });
      if (!invoice) continue;

      const newStatus = doc.success ? 'SENT' : 'ERROR';
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          krosDocumentId: doc.documentId ? String(doc.documentId) : null,
          documentNumber: doc.documentNumber || null,
          variableSymbol: doc.variableSymbol || null,
        },
      });

      this.logger.log(`Invoice ${invoice.id} webhook: ${newStatus}`);
    }
  }
}
