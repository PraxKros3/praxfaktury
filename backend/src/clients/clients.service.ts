import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.client.findMany({
      where: { userId },
      include: {
        _count: { select: { invoices: true, projects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
      include: {
        projects: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!client) throw new NotFoundException('Klient neexistuje');
    return client;
  }

  create(userId: string, data: any) {
    return this.prisma.client.create({ data: { ...data, userId } });
  }

  async update(userId: string, id: string, data: any) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException('Klient neexistuje');
    return this.prisma.client.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException('Klient neexistuje');
    return this.prisma.client.delete({ where: { id } });
  }
}
