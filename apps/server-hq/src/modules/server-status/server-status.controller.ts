import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServerStatusService } from '@serverpilot/infra';

@Controller('server-status')
@UseGuards(JwtAuthGuard)
export class ServerStatusController {
  constructor(private readonly serverStatusService: ServerStatusService) {}

  @Get()
  getStatus() {
    return this.serverStatusService.getStatus();
  }
}
