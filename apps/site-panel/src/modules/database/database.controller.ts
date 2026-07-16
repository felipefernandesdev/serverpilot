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
import { DatabaseService } from './database.service';
import { CreateDatabaseDto, CreateDatabaseUserDto } from './dto/create-database.dto';

@Controller('databases')
@UseGuards(JwtAuthGuard)
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.databaseService.findAll(req.user.sub);
  }

  @Get('usage')
  async getUsage(@Request() req: any) {
    return this.databaseService.getUsage(req.user.sub);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.databaseService.findById(req.user.sub, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateDatabaseDto) {
    return this.databaseService.create(req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.databaseService.remove(req.user.sub, id);
  }

  @Post(':id/users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateDatabaseUserDto,
  ) {
    return this.databaseService.createUser(req.user.sub, id, dto);
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.databaseService.deleteUser(req.user.sub, id, userId);
  }
}
