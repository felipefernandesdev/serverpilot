import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubdomainDto } from './dto/create-subdomain.dto';

@Injectable()
export class DomainService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: string) {
    const subdomains = await this.prisma.subdomain.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });

    return subdomains;
  }

  async findById(accountId: string, id: string) {
    const subdomain = await this.prisma.subdomain.findFirst({
      where: { id, accountId },
    });

    if (!subdomain) {
      throw new NotFoundException('Subdomain not found');
    }

    return subdomain;
  }

  async create(accountId: string, dto: CreateSubdomainDto) {
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

    const count = await this.prisma.subdomain.count({
      where: { accountId },
    });

    const pkg = account.package;
    if (pkg && count >= pkg.subdomains) {
      throw new ForbiddenException('Subdomain quota exceeded');
    }

    const existing = await this.prisma.subdomain.findFirst({
      where: { subdomain: dto.subdomain, accountId },
    });

    if (existing) {
      throw new ConflictException('Subdomain already exists');
    }

    return this.prisma.subdomain.create({
      data: {
        subdomain: dto.subdomain,
        documentRoot: dto.documentRoot || `${account.documentRoot}/${dto.subdomain}`,
        accountId,
      },
    });
  }

  async remove(accountId: string, id: string) {
    await this.findById(accountId, id);

    await this.prisma.subdomain.delete({
      where: { id },
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

    const count = await this.prisma.subdomain.count({
      where: { accountId },
    });

    return {
      used: count,
      limit: account.package?.subdomains ?? 0,
    };
  }
}
