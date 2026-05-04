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

  async getMyProjects(token: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${TOGGL_BASE}/me/projects?active=true`, {
        headers: this.headers(token),
      }),
    );
    return data || [];
  }

  async getTimeEntries(token: string, startDate: Date, endDate: Date) {
    const start = startDate.toISOString().split('.')[0] + 'Z';
    const end = endDate.toISOString().split('.')[0] + 'Z';
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

    // Clients — graceful fallback na prázdny zoznam ak workspace API nedostupné
    let togglClients: any[] = [];
    try {
      togglClients = await this.getClients(token, workspaceId);
    } catch (err) {
      this.logger.warn(`Toggl klienti nedostupní (plán/oprávnenie): ${this.extractError(err)} — preskakujem`);
    }

    // Projects — skúsi workspace endpoint, fallback na /me/projects
    let togglProjects: any[] = [];
    try {
      togglProjects = await this.getProjects(token, workspaceId);
    } catch (err) {
      this.logger.warn(`Workspace projekty nedostupné: ${this.extractError(err)} — skúšam /me/projects`);
      try {
        togglProjects = await this.getMyProjects(token);
      } catch (err2) {
        this.logger.warn(`Toggl projekty nedostupné: ${this.extractError(err2)} — preskakujem`);
      }
    }

    // Upsert clients
    for (const tc of togglClients) {
      await this.prisma.client.upsert({
        where: { userId_togglId: { userId, togglId: String(tc.id) } },
        update: { name: tc.name },
        create: { userId, togglId: String(tc.id), name: tc.name },
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
        create: { userId, togglId: String(tp.id), name: tp.name, color: tp.color, clientId },
      });
    }

    // Time entries — vždy cez osobný endpoint, nevyžaduje workspace prístup
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 89);

    let entries: any[];
    try {
      entries = await this.getTimeEntries(token, startDate, endDate);
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr?.response?.status;
      if (status === 401) throw new BadRequestException('Neplatný Toggl API token');
      if (status === 429) throw new InternalServerErrorException('Toggl API rate limit — skúste neskôr');
      throw new InternalServerErrorException(`Toggl API chyba: ${this.extractError(err)}`);
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

  private extractError(err: any): string {
    const axiosErr = err as AxiosError;
    if (axiosErr?.response) {
      const body = axiosErr.response.data ? JSON.stringify(axiosErr.response.data) : '';
      return `HTTP ${axiosErr.response.status}${body ? ` — ${body}` : ''}`;
    }
    return err?.message || 'unknown';
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
