import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DomainService } from './domain.service';
import { CreateSubdomainDto } from './dto/create-subdomain.dto';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.domainService.findAll(req.user.sub);
  }

  @Get('usage')
  async getUsage(@Request() req: any) {
    return this.domainService.getUsage(req.user.sub);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.domainService.findById(req.user.sub, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateSubdomainDto) {
    return this.domainService.create(req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.domainService.remove(req.user.sub, id);
  }
}
