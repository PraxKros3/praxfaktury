import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async update(userId: string, id: string, data: any) {
    const project = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException('Projekt neexistuje');
    return this.prisma.project.update({ where: { id }, data });
  }
}
