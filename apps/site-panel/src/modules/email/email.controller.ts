import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailService } from './email.service';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreateForwarderDto } from './dto/create-forwarder.dto';
import { CreateFilterDto } from './dto/create-filter.dto';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.emailService.findAll(req.user.sub);
  }

  @Get('usage')
  async getUsage(@Request() req: any) {
    return this.emailService.getUsage(req.user.sub);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.emailService.findById(req.user.sub, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateEmailDto) {
    return this.emailService.create(req.user.sub, dto);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.emailService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.emailService.remove(req.user.sub, id);
  }

  @Get(':id/forwarders')
  async getForwarders(@Request() req: any, @Param('id') id: string) {
    return this.emailService.getForwarders(req.user.sub, id);
  }

  @Post(':id/forwarders')
  @HttpCode(HttpStatus.CREATED)
  async createForwarder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateForwarderDto,
  ) {
    return this.emailService.createForwarder(req.user.sub, id, dto);
  }

  @Delete(':id/forwarders/:forwarderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForwarder(
    @Request() req: any,
    @Param('id') id: string,
    @Param('forwarderId') forwarderId: string,
  ) {
    await this.emailService.deleteForwarder(req.user.sub, id, forwarderId);
  }

  @Get(':id/filters')
  async getFilters(@Request() req: any, @Param('id') id: string) {
    return this.emailService.getFilters(req.user.sub, id);
  }

  @Post(':id/filters')
  @HttpCode(HttpStatus.CREATED)
  async createFilter(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateFilterDto,
  ) {
    return this.emailService.createFilter(req.user.sub, id, dto);
  }

  @Delete(':id/filters/:filterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFilter(
    @Request() req: any,
    @Param('id') id: string,
    @Param('filterId') filterId: string,
  ) {
    await this.emailService.deleteFilter(req.user.sub, id, filterId);
  }
}
