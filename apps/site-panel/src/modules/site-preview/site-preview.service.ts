import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

@Injectable()
export class SitePreviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generatePreviewToken(accountId: string): Promise<string> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, username: true, domain: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.jwtService.sign(
      { sub: account.id, username: account.username, domain: account.domain, type: 'preview' },
      { expiresIn: '5m' },
    );
  }

  async getFile(accountId: string, requestedPath: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const basePath = account.documentRoot;
    const filePath = requestedPath || '/index.html';
    const normalized = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(basePath, normalized);

    const realBase = await fs.realpath(basePath).catch(() => basePath);
    const realFull = await fs.realpath(fullPath).catch(() => fullPath);

    if (!realFull.startsWith(realBase)) {
      throw new ForbiddenException('Access denied: path outside document root');
    }

    let targetPath = fullPath;
    const stat = await fs.stat(targetPath).catch(() => null);

    if (!stat) {
      throw new NotFoundException('File not found');
    }

    if (stat.isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
      await fs.stat(targetPath).catch(() => {
        throw new NotFoundException('No index.html in directory');
      });
    }

    const content = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();

    return {
      content,
      mimeType: MIME_TYPES[ext] || 'application/octet-stream',
    };
  }
}
