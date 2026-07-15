import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        skip,
        take: limit,
        include: {
          package: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count(),
    ]);

    return {
      accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        package: true,
        emailAccounts: true,
        databases: true,
        subdomains: true,
        ftpAccounts: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async create(dto: CreateAccountDto) {
    // Check if username exists
    const existingUsername = await this.prisma.account.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if domain exists
    const existingDomain = await this.prisma.account.findUnique({
      where: { domain: dto.domain },
    });

    if (existingDomain) {
      throw new ConflictException('Domain already exists');
    }

    // Validate package exists
    const pkg = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create account
    const account = await this.prisma.account.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        domain: dto.domain,
        documentRoot: `/home/${dto.username}/public_html`,
        packageId: dto.packageId,
        userId: dto.userId,
      },
      include: {
        package: true,
      },
    });

    // TODO: Execute server commands
    // await this.serverService.createLinuxUser(dto.username, dto.password);
    // await this.serverService.createDirectory(`/home/${dto.username}/public_html`);
    // await this.serverService.createVirtualHost(dto.username, dto.domain);

    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    const account = await this.findById(id);

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: dto,
      include: {
        package: true,
      },
    });

    return updatedAccount;
  }

  async remove(id: string) {
    const account = await this.findById(id);

    // TODO: Execute server commands to remove account
    // await this.serverService.deleteLinuxUser(account.username);
    // await this.serverService.deleteDirectory(account.documentRoot);
    // await this.serverService.deleteVirtualHost(account.username);

    await this.prisma.account.delete({
      where: { id },
    });
  }

  async suspend(id: string, reason: string) {
    const account = await this.findById(id);

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: {
        isActive: false,
        suspendedAt: new Date(),
        suspendReason: reason,
      },
      include: {
        package: true,
      },
    });

    // TODO: Execute server commands to suspend account
    // await this.serverService.suspendAccount(account.username);

    return updatedAccount;
  }

  async unsuspend(id: string) {
    const account = await this.findById(id);

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: {
        isActive: true,
        suspendedAt: null,
        suspendReason: null,
      },
      include: {
        package: true,
      },
    });

    // TODO: Execute server commands to unsuspend account
    // await this.serverService.unsuspendAccount(account.username);

    return updatedAccount;
  }

  async getUsage(id: string) {
    const account = await this.findById(id);

    return {
      disk: {
        used: account.diskUsed,
        limit: account.package?.diskSpace || 0,
        percentage: account.package
          ? Math.round((account.diskUsed / account.package.diskSpace) * 100)
          : 0,
      },
      bandwidth: {
        used: account.bandwidthUsed,
        limit: account.package?.bandwidth || 0,
        percentage: account.package
          ? Math.round((account.bandwidthUsed / account.package.bandwidth) * 100)
          : 0,
      },
      email: {
        used: account.emailAccounts.length,
        limit: account.package?.emailAccounts || 0,
      },
      databases: {
        used: account.databases.length,
        limit: account.package?.databases || 0,
      },
      subdomains: {
        used: account.subdomains.length,
        limit: account.package?.subdomains || 0,
      },
      ftp: {
        used: account.ftpAccounts.length,
        limit: account.package?.ftpAccounts || 0,
      },
    };
  }
}
