import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { PackagesModule } from './modules/packages/packages.module';
import { ServerStatusModule } from './modules/server-status/server-status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AccountsModule,
    PackagesModule,
    ServerStatusModule,
  ],
})
export class AppModule {}
