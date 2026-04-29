import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TogglModule } from './toggl/toggl.module';
import { KrosModule } from './kros/kros.module';
import { CronModule } from './cron/cron.module';
import { ManualEntriesModule } from './manual-entries/manual-entries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    TimeEntriesModule,
    InvoicesModule,
    TogglModule,
    KrosModule,
    CronModule,
    ManualEntriesModule,
  ],
})
export class AppModule {}
