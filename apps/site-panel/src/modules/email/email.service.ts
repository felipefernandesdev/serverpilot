import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreateForwarderDto } from './dto/create-forwarder.dto';
import { CreateFilterDto } from './dto/create-filter.dto';

@Injectable()
export class EmailService {
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: string) {
    const emails = await this.prisma.emailAccount.findMany({
      where: { accountId },
      include: {
        forwarders: true,
        filters: true,
        _count: {
          select: { forwarders: true, filters: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return emails;
  }

  async findById(accountId: string, emailId: string) {
    const email = await this.prisma.emailAccount.findFirst({
      where: { id: emailId, accountId },
      include: {
        forwarders: true,
        filters: true,
      },
    });

    if (!email) {
      throw new NotFoundException('Email account not found');
    }

    return email;
  }

  async create(accountId: string, dto: CreateEmailDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { package: true, emailAccounts: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.isActive) {
      throw new ForbiddenException('Account is suspended');
    }

    const pkg = account.package;
    if (pkg && account.emailAccounts.length >= pkg.emailAccounts) {
      throw new ForbiddenException('Email account quota exceeded');
    }

    const existing = await this.prisma.emailAccount.findFirst({
      where: { email: dto.email, accountId },
    });

    if (existing) {
      throw new ConflictException('Email account already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const email = await this.prisma.emailAccount.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        quota: dto.quota ?? 1024,
        accountId,
      },
      include: {
        forwarders: true,
        filters: true,
      },
    });

    return email;
  }

  async update(accountId: string, emailId: string, dto: UpdateEmailDto) {
    const email = await this.findById(accountId, emailId);

    const data: Record<string, unknown> = {};
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }
    if (dto.quota !== undefined) {
      data.quota = dto.quota;
    }

    const updated = await this.prisma.emailAccount.update({
      where: { id: emailId },
      data,
      include: {
        forwarders: true,
        filters: true,
      },
    });

    return updated;
  }

  async remove(accountId: string, emailId: string) {
    await this.findById(accountId, emailId);

    await this.prisma.emailForwarder.deleteMany({
      where: { emailAccountId: emailId },
    });

    await this.prisma.emailFilter.deleteMany({
      where: { emailAccountId: emailId },
    });

    await this.prisma.emailAccount.delete({
      where: { id: emailId },
    });
  }

  async getForwarders(accountId: string, emailId: string) {
    await this.findById(accountId, emailId);

    return this.prisma.emailForwarder.findMany({
      where: { emailAccountId: emailId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForwarder(accountId: string, emailId: string, dto: CreateForwarderDto) {
    await this.findById(accountId, emailId);

    const existing = await this.prisma.emailForwarder.findFirst({
      where: { source: dto.source, emailAccountId: emailId },
    });

    if (existing) {
      throw new ConflictException('Forwarder already exists for this source');
    }

    return this.prisma.emailForwarder.create({
      data: {
        source: dto.source,
        destination: dto.destination,
        emailAccountId: emailId,
      },
    });
  }

  async deleteForwarder(accountId: string, emailId: string, forwarderId: string) {
    await this.findById(accountId, emailId);

    const forwarder = await this.prisma.emailForwarder.findFirst({
      where: { id: forwarderId, emailAccountId: emailId },
    });

    if (!forwarder) {
      throw new NotFoundException('Forwarder not found');
    }

    await this.prisma.emailForwarder.delete({
      where: { id: forwarderId },
    });
  }

  async getFilters(accountId: string, emailId: string) {
    await this.findById(accountId, emailId);

    return this.prisma.emailFilter.findMany({
      where: { emailAccountId: emailId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFilter(accountId: string, emailId: string, dto: CreateFilterDto) {
    await this.findById(accountId, emailId);

    return this.prisma.emailFilter.create({
      data: {
        name: dto.name,
        rule: dto.rule,
        pattern: dto.pattern,
        action: dto.action ?? 'discard',
        destination: dto.destination,
        emailAccountId: emailId,
      },
    });
  }

  async deleteFilter(accountId: string, emailId: string, filterId: string) {
    await this.findById(accountId, emailId);

    const filter = await this.prisma.emailFilter.findFirst({
      where: { id: filterId, emailAccountId: emailId },
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    await this.prisma.emailFilter.delete({
      where: { id: filterId },
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

    const emails = await this.prisma.emailAccount.findMany({
      where: { accountId },
      select: { usedSpace: true },
    });

    const totalUsed = emails.reduce((sum, e) => sum + e.usedSpace, 0);

    return {
      used: emails.length,
      limit: account.package?.emailAccounts ?? 0,
      spaceUsed: totalUsed,
      spaceLimit: account.package?.diskSpace ?? 0,
    };
  }
}
