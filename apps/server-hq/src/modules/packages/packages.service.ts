import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.package.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        accounts: true,
      },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return pkg;
  }

  async create(dto: CreatePackageDto) {
    // Check if name exists
    const existingName = await this.prisma.package.findUnique({
      where: { name: dto.name },
    });

    if (existingName) {
      throw new ConflictException('Package name already exists');
    }

    const pkg = await this.prisma.package.create({
      data: {
        name: dto.name,
        description: dto.description,
        diskSpace: dto.diskSpace || 1024,
        bandwidth: dto.bandwidth || 10240,
        emailAccounts: dto.emailAccounts || 10,
        databases: dto.databases || 5,
        subdomains: dto.subdomains || 10,
        ftpAccounts: dto.ftpAccounts || 5,
        SSL: dto.ssl !== undefined ? dto.ssl : true,
        sshAccess: dto.sshAccess || false,
      },
    });

    return pkg;
  }

  async update(id: string, dto: UpdatePackageDto) {
    await this.findById(id);

    // Check if new name conflicts
    if (dto.name) {
      const existingName = await this.prisma.package.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (existingName) {
        throw new ConflictException('Package name already exists');
      }
    }

    const updatedPkg = await this.prisma.package.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        diskSpace: dto.diskSpace,
        bandwidth: dto.bandwidth,
        emailAccounts: dto.emailAccounts,
        databases: dto.databases,
        subdomains: dto.subdomains,
        ftpAccounts: dto.ftpAccounts,
        SSL: dto.ssl,
        sshAccess: dto.sshAccess,
      },
    });

    return updatedPkg;
  }

  async remove(id: string) {
    const pkg = await this.findById(id);

    // Check if package has accounts
    if (pkg.accounts.length > 0) {
      throw new ConflictException(
        `Cannot delete package with ${pkg.accounts.length} active accounts`,
      );
    }

    await this.prisma.package.delete({
      where: { id },
    });
  }
}
