import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InvoicesController } from './invoices.controller';
import { InvoicePrintController } from './invoice-print.controller';
import { InvoicesService } from './invoices.service';
import { KrosModule } from '../kros/kros.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    KrosModule,
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [InvoicesController, InvoicePrintController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
