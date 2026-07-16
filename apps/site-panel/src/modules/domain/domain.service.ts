import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubdomainDto } from './dto/create-subdomain.dto';
import { DnsService, DockerExecService } from '@serverpilot/infra';

const SUBDOMAIN_VHOST = (subdomain: string, domain: string, username: string, docRoot: string) => `
server {
    listen 80;
    server_name ${subdomain}.${domain};
    root ${docRoot};
    index index.html index.htm index.php;

    access_log /var/log/nginx/${username}_sub_access.log;
    error_log /var/log/nginx/${username}_sub_error.log;

    location / {
        try_files \${uri} \${uri}/ =404;
    }

    location ~ \\.php\$ {
        fastcgi_pass unix:/var/run/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }
}
`;

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);
  private readonly docker: DockerExecService;
  private readonly dns: DnsService;

  constructor(private readonly prisma: PrismaService) {
    this.docker = new DockerExecService();
    this.dns = new DnsService();
  }

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

    const docRoot = dto.documentRoot || `${account.documentRoot}/${dto.subdomain}`;
    const fullDomain = `${dto.subdomain}.${account.domain}`;

    const subdomain = await this.prisma.subdomain.create({
      data: {
        subdomain: dto.subdomain,
        documentRoot: docRoot,
        accountId,
      },
    });

    await this.provisionSubdomain(fullDomain, dto.subdomain, account.username, docRoot, account.domain)
      .catch((err) => this.logger.warn(`Subdomain provisioning failed: ${err.message}`));

    return subdomain;
  }

  async remove(accountId: string, id: string) {
    const subdomain = await this.findById(accountId, id);
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    await this.prisma.subdomain.delete({
      where: { id },
    });

    if (account) {
      const fullDomain = `${subdomain.subdomain}.${account.domain}`;
      await this.deprovisionSubdomain(fullDomain, subdomain.subdomain, account.username, account.domain)
        .catch((err) => this.logger.warn(`Subdomain deprovisioning failed: ${err.message}`));
    }
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

  private async provisionSubdomain(
    fullDomain: string,
    subdomain: string,
    username: string,
    docRoot: string,
    zoneDomain: string,
  ): Promise<void> {
    const results = await Promise.allSettled([
      this.docker.exec('nginx', `mkdir -p ${docRoot}`),
      this.docker.exec('nginx', `chmod 755 ${docRoot}`),
      this.docker.writeFile(
        'nginx',
        `/etc/nginx/conf.d/${username}-${subdomain}.conf`,
        SUBDOMAIN_VHOST(subdomain, zoneDomain, username, docRoot),
      ),
      this.dns.addRecord(zoneDomain, subdomain, 'A', '127.0.0.1'),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Provisioning step failed: ${result.reason}`);
      }
    }

    try {
      this.docker.exec('nginx', 'nginx -s reload');
    } catch (err: any) {
      this.logger.warn(`nginx reload failed: ${err.message}`);
    }
  }

  private async deprovisionSubdomain(
    fullDomain: string,
    subdomain: string,
    username: string,
    zoneDomain: string,
  ): Promise<void> {
    const results = await Promise.allSettled([
      this.docker.rm('nginx', `/etc/nginx/conf.d/${username}-${subdomain}.conf`),
      this.dns.removeRecord(zoneDomain, subdomain, 'A'),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Deprovisioning step failed: ${result.reason}`);
      }
    }

    try {
      this.docker.exec('nginx', 'nginx -s reload');
    } catch (err: any) {
      this.logger.warn(`nginx reload failed: ${err.message}`);
    }
  }
}
