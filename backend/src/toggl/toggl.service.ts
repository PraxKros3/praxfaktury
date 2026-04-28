import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';

const TOGGL_BASE = 'https://api.track.toggl.com/api/v9';

@Injectable()
export class TogglService {
  private readonly logger = new Logger(TogglService.name);

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
  ) {}

  private headers(token: string) {
    const encoded = Buffer.from(`${token}:api_token`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  async getMe(token: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${TOGGL_BASE}/me`, { headers: this.headers(token) }),
    );
    return data;
  }

  async getWorkspaces(token: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${TOGGL_BASE}/workspaces`, { headers: this.headers(token) }),
    );
    return data;
  }

  async getClients(token: string, workspaceId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${TOGGL_BASE}/workspaces/${workspaceId}/clients`, {
        headers: this.headers(token),
      }),
    );
    return data || [];
  }

  async getProjects(token: string, workspaceId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${TOGGL_BASE}/workspaces/${workspaceId}/projects?active=true`, {
        headers: this.headers(token),
      }),
    );
    return data || [];
  }

  async getTimeEntries(token: string, startDate: Date, endDate: Date) {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    const { data } = await firstValueFrom(
      this.http.get(`${TOGGL_BASE}/me/time_entries?start_date=${start}&end_date=${end}`, {
        headers: this.headers(token),
      }),
    );
    return data || [];
  }

  async syncAll(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.togglApiToken || !user?.togglWorkspaceId) {
      throw new BadRequestException('Toggl API token alebo Workspace ID nie je nastavený');
    }

    const token = user.togglApiToken;
    const workspaceId = user.togglWorkspaceId;

    this.logger.log(`Syncing Toggl data for user ${userId}`);

    let togglClients: any[];
    let togglProjects: any[];
    try {
      [togglClients, togglProjects] = await Promise.all([
        this.getClients(token, workspaceId),
        this.getProjects(token, workspaceId),
      ]);
    } catch (err) {
      this.handleTogglError(err, 'klientov/projektov');
    }

    // Upsert clients
    for (const tc of togglClients) {
      await this.prisma.client.upsert({
        where: { userId_togglId: { userId, togglId: String(tc.id) } },
        update: { name: tc.name },
        create: {
          userId,
          togglId: String(tc.id),
          name: tc.name,
        },
      });
    }

    // Upsert projects
    for (const tp of togglProjects) {
      const clientId = tp.client_id
        ? await this.findClientByTogglId(userId, String(tp.client_id))
        : null;

      await this.prisma.project.upsert({
        where: { userId_togglId: { userId, togglId: String(tp.id) } },
        update: { name: tp.name, color: tp.color, clientId },
        create: {
          userId,
          togglId: String(tp.id),
          name: tp.name,
          color: tp.color,
          clientId,
        },
      });
    }

    // Sync time entries for last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    let entries: any[];
    try {
      entries = await this.getTimeEntries(token, startDate, endDate);
    } catch (err) {
      this.handleTogglError(err, 'časových záznamov');
    }

    let synced = 0;

    for (const te of entries) {
      if (!te.stop) continue;

      const project = te.project_id
        ? await this.findProjectByTogglId(userId, String(te.project_id))
        : null;

      const duration = te.duration > 0 ? te.duration : 0;

      try {
        await this.prisma.timeEntry.upsert({
          where: { togglId: String(te.id) },
          update: {
            description: te.description,
            startTime: new Date(te.start),
            endTime: te.stop ? new Date(te.stop) : null,
            duration,
            billable: te.billable ?? false,
            projectId: project,
          },
          create: {
            togglId: String(te.id),
            description: te.description,
            startTime: new Date(te.start),
            endTime: te.stop ? new Date(te.stop) : null,
            duration,
            billable: te.billable ?? false,
            projectId: project,
          },
        });
        synced++;
      } catch (err) {
        this.logger.error(`Upsert TimeEntry ${te.id} zlyhal: ${err.message}`);
      }
    }

    await this.prisma.syncLog.create({
      data: {
        userId,
        type: 'TOGGL',
        status: 'success',
        message: `Synced ${togglClients.length} clients, ${togglProjects.length} projects, ${synced} time entries`,
      },
    });

    return {
      clients: togglClients.length,
      projects: togglProjects.length,
      timeEntries: synced,
    };
  }

  private handleTogglError(err: any, context: string): never {
    const axiosErr = err as AxiosError;
    if (axiosErr?.response) {
      const status = axiosErr.response.status;
      const body = JSON.stringify(axiosErr.response.data);
      this.logger.error(`Toggl API chyba pri načítaní ${context}: HTTP ${status} - ${body}`);
      if (status === 401) {
        throw new BadRequestException('Neplatný Toggl API token');
      }
      if (status === 403) {
        throw new BadRequestException('Neplatný Toggl Workspace ID — skontroluj nastavenia');
      }
      if (status === 429) {
        throw new InternalServerErrorException('Toggl API rate limit - skúste to neskôr');
      }
      throw new InternalServerErrorException(`Toggl API vrátilo chybu ${status}`);
    }
    this.logger.error(`Toggl sieťová chyba pri načítaní ${context}: ${err.message}`, err.stack);
    throw new InternalServerErrorException(`Toggl API je nedostupné: ${err.message}`);
  }

  private async findClientByTogglId(userId: string, togglId: string): Promise<string | null> {
    const client = await this.prisma.client.findUnique({
      where: { userId_togglId: { userId, togglId } },
    });
    return client?.id ?? null;
  }

  private async findProjectByTogglId(userId: string, togglId: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { userId_togglId: { userId, togglId } },
    });
    return project?.id ?? null;
  }
}
