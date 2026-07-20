import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { SuspendAccountDto } from './dto/suspend-account.dto';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = parseInt(page || '1', 10);
    const l = parseInt(limit || '10', 10);
    return this.accountsService.findAll(p > 0 ? p : 1, l > 0 ? l : 10);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const account = await this.accountsService.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(createAccountDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.accountsService.remove(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string, @Body() suspendAccountDto: SuspendAccountDto) {
    return this.accountsService.suspend(id, suspendAccountDto.reason);
  }

  @Post(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspend(@Param('id') id: string) {
    return this.accountsService.unsuspend(id);
  }

  @Get(':id/usage')
  async getUsage(@Param('id') id: string) {
    return this.accountsService.getUsage(id);
  }

  @Get(':id/dns')
  async getDns(@Param('id') id: string) {
    return this.accountsService.getDns(id);
  }
}
