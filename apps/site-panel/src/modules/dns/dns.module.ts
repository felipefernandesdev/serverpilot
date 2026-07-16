import { Module } from '@nestjs/common';
import { DnsController } from './dns.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DnsController],
})
export class DnsModule {}
