import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { FileManagerModule } from './modules/file-manager/file-manager.module';
import { EmailModule } from './modules/email/email.module';
import { DatabaseModule } from './modules/database/database.module';
import { DomainModule } from './modules/domain/domain.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SitePreviewModule } from './modules/site-preview/site-preview.module';
import { DnsModule } from './modules/dns/dns.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    FileManagerModule,
    EmailModule,
    DatabaseModule,
    DomainModule,
    MetricsModule,
    SitePreviewModule,
    DnsModule,
  ],
})
export class AppModule {}
