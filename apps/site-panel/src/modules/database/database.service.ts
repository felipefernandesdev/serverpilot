import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDatabaseDto, CreateDatabaseUserDto } from './dto/create-database.dto';

@Injectable()
export class DatabaseService {
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: string) {
    const databases = await this.prisma.database.findMany({
      where: { accountId },
      include: {
        users: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return databases;
  }

  async findById(accountId: string, databaseId: string) {
    const database = await this.prisma.database.findFirst({
      where: { id: databaseId, accountId },
      include: { users: true },
    });

    if (!database) {
      throw new NotFoundException('Database not found');
    }

    return database;
  }

  async create(accountId: string, dto: CreateDatabaseDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { package: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.isActive) {
      throw new ForbiddenException('Account is suspended');
    }

    const databases = await this.prisma.database.count({
      where: { accountId },
    });

    const pkg = account.package;
    if (pkg && databases >= pkg.databases) {
      throw new ForbiddenException('Database quota exceeded');
    }

    const existing = await this.prisma.database.findFirst({
      where: { name: dto.name, accountId },
    });

    if (existing) {
      throw new ConflictException('Database already exists');
    }

    return this.prisma.database.create({
      data: {
        name: dto.name,
        type: dto.type,
        accountId,
      },
      include: { users: true },
    });
  }

  async remove(accountId: string, databaseId: string) {
    await this.findById(accountId, databaseId);

    await this.prisma.databaseUser.deleteMany({
      where: { databaseId },
    });

    await this.prisma.database.delete({
      where: { id: databaseId },
    });
  }

  async createUser(accountId: string, databaseId: string, dto: CreateDatabaseUserDto) {
    await this.findById(accountId, databaseId);

    const existing = await this.prisma.databaseUser.findFirst({
      where: { username: dto.username, databaseId },
    });

    if (existing) {
      throw new ConflictException('Database user already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    return this.prisma.databaseUser.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        privileges: dto.privileges,
        databaseId,
      },
    });
  }

  async deleteUser(accountId: string, databaseId: string, userId: string) {
    await this.findById(accountId, databaseId);

    const user = await this.prisma.databaseUser.findFirst({
      where: { id: userId, databaseId },
    });

    if (!user) {
      throw new NotFoundException('Database user not found');
    }

    await this.prisma.databaseUser.delete({
      where: { id: userId },
    });
  }

  async getUsage(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { package: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const count = await this.prisma.database.count({
      where: { accountId },
    });

    return {
      used: count,
      limit: account.package?.databases ?? 0,
    };
  }
}
