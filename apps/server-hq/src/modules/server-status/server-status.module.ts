import { Module } from '@nestjs/common';
import { ServerStatusController } from './server-status.controller';
import { ServerStatusService } from '@serverpilot/infra';

@Module({
  controllers: [ServerStatusController],
  providers: [ServerStatusService],
})
export class ServerStatusModule {}
