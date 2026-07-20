import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  DockerExecService,
  NginxService,
  MailService,
  DnsService,
  DnsRecord,
  DatabaseProvisioningService,
} from '@serverpilot/infra';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  private readonly nginx: NginxService;
  private readonly mail: MailService;
  private readonly dns: DnsService;
  private readonly database: DatabaseProvisioningService;

  constructor(private readonly prisma: PrismaService) {
    const docker = new DockerExecService();
    this.nginx = new NginxService(docker);
    this.mail = new MailService(docker);
    this.dns = new DnsService();
    this.database = new DatabaseProvisioningService(docker);
  }

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
        cronJobs: true,
        backups: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async getDns(id: string): Promise<{ zone: string | null; records: DnsRecord[] }> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { domain: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const records = await this.dns.listRecords(account.domain);
    return { zone: account.domain, records };
  }

  async create(dto: CreateAccountDto) {
    const existingUsername = await this.prisma.account.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingDomain = await this.prisma.account.findUnique({
      where: { domain: dto.domain },
    });

    if (existingDomain) {
      throw new ConflictException('Domain already exists');
    }

    const pkg = await this.prisma.package.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

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

    await this.provisionInfrastructure(account.username, account.domain, dto.password, dto.templateDomain).catch(
      (err) => this.logger.error(`Infra provisioning failed for ${account.username}: ${err.message}`),
    );

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

    await this.deprovisionInfrastructure(account.username, account.domain).catch(
      (err) => this.logger.error(`Infra deprovisioning failed for ${account.username}: ${err.message}`),
    );

    await this.prisma.emailAccount.deleteMany({ where: { accountId: id } });
    const databases = await this.prisma.database.findMany({ where: { accountId: id }, select: { id: true } });
    for (const db of databases) {
      await this.prisma.databaseUser.deleteMany({ where: { databaseId: db.id } });
    }
    await this.prisma.database.deleteMany({ where: { accountId: id } });
    await this.prisma.subdomain.deleteMany({ where: { accountId: id } });
    await this.prisma.ftpAccount.deleteMany({ where: { accountId: id } });
    await this.prisma.cronJob.deleteMany({ where: { accountId: id } });
    await this.prisma.backup.deleteMany({ where: { accountId: id } });

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

    await this.nginx.disableVhost(account.username).catch(
      (err) => this.logger.warn(`Failed to disable vhost for ${account.username}: ${err.message}`),
    );

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

    await this.nginx.enableVhost(account.username).catch(
      (err) => this.logger.warn(`Failed to enable vhost for ${account.username}: ${err.message}`),
    );

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

  private async provisionInfrastructure(username: string, domain: string, password: string, templateDomain?: string): Promise<void> {
    const dnsPromise = templateDomain
      ? this.dns.copyZoneFromDomain(templateDomain, domain)
      : this.dns.createZone(domain);

    const results = await Promise.allSettled([
      this.nginx.createVhost(username, domain),
      this.mail.setupDomain(domain),
      dnsPromise,
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Provisioning step failed: ${result.reason}`);
      }
    }
  }

  private async deprovisionInfrastructure(username: string, domain: string): Promise<void> {
    const results = await Promise.allSettled([
      this.nginx.deleteVhost(username),
      this.mail.removeDomain(domain),
      this.dns.deleteZone(domain),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Deprovisioning step failed: ${result.reason}`);
      }
    }
  }
}
