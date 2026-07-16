import {
  Controller, Get, Post, Delete, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DnsService, DnsRecord } from '@serverpilot/infra';

@Controller('dns')
@UseGuards(JwtAuthGuard)
export class DnsController {
  private readonly dnsService = new DnsService();

  @Get('records')
  async getRecords(@Request() req: any, @Query('domain') domain: string): Promise<DnsRecord[]> {
    return this.dnsService.listRecords(domain);
  }

  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  async addRecord(
    @Request() req: any,
    @Body() body: { domain: string; name: string; type: string; content: string; ttl?: number },
  ): Promise<{ success: boolean }> {
    await this.dnsService.addRecord(body.domain, body.name, body.type, body.content, body.ttl || 3600);
    return { success: true };
  }

  @Delete('records')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRecord(
    @Request() req: any,
    @Body() body: { domain: string; name: string; type: string },
  ): Promise<void> {
    await this.dnsService.removeRecord(body.domain, body.name, body.type);
  }
}
