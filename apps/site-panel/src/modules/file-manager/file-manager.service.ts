import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FileManagerService {
  constructor(private readonly prisma: PrismaService) {}

  async listFiles(accountId: string, requestedPath: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(entryPath);

        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          permissions: stats.mode.toString(8).slice(-3),
        };
      }),
    );

    return {
      path: requestedPath,
      files: files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      }),
    };
  }

  async getFileContent(accountId: string, requestedPath: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    const stats = await fs.stat(fullPath);
    if (stats.size > 1024 * 1024) {
      throw new ForbiddenException('File too large to edit (>1MB)');
    }

    const content = await fs.readFile(fullPath, 'utf-8');

    return {
      path: requestedPath,
      content,
      size: stats.size,
      modified: stats.mtime,
    };
  }

  async createDirectory(accountId: string, requestedPath: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    await fs.mkdir(fullPath, { recursive: true });

    return { path: requestedPath, created: true };
  }

  async writeFile(accountId: string, requestedPath: string, content: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    await fs.writeFile(fullPath, content, 'utf-8');

    return { path: requestedPath, saved: true };
  }

  async deleteFile(accountId: string, requestedPath: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
  }

  async renameFile(accountId: string, oldPath: string, newPath: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullOldPath = this.resolvePath(basePath, oldPath);
    const fullNewPath = this.resolvePath(basePath, newPath);

    await this.validatePath(basePath, fullOldPath);
    await this.validatePath(basePath, fullNewPath);

    await fs.rename(fullOldPath, fullNewPath);

    return { oldPath, newPath, renamed: true };
  }

  async uploadFile(accountId: string, requestedPath: string, file: Express.Multer.File) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    const stats = await fs.stat(fullPath).catch(() => null);
    if (stats && stats.isDirectory()) {
      const filePath = path.join(fullPath, file.originalname);
      await fs.writeFile(filePath, file.buffer);
      return { path: requestedPath, file: file.originalname, size: file.size, uploaded: true };
    }

    await fs.writeFile(fullPath, file.buffer);
    return { path: requestedPath, file: path.basename(fullPath), size: file.size, uploaded: true };
  }

  async downloadFile(accountId: string, requestedPath: string) {
    const account = await this.getAccount(accountId);
    const basePath = account.documentRoot;
    const fullPath = this.resolvePath(basePath, requestedPath);

    await this.validatePath(basePath, fullPath);

    const content = await fs.readFile(fullPath);
    const filename = path.basename(fullPath);

    return {
      filename,
      content: content.toString('base64'),
      mimeType: 'application/octet-stream',
    };
  }

  private async getAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  private resolvePath(basePath: string, requestedPath: string): string {
    const normalized = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '');
    return path.join(basePath, normalized);
  }

  private async validatePath(basePath: string, fullPath: string): Promise<void> {
    const realBase = await fs.realpath(basePath).catch(() => basePath);
    const realFull = await fs.realpath(fullPath).catch(() => fullPath);

    if (!realFull.startsWith(realBase)) {
      throw new ForbiddenException('Access denied: path outside document root');
    }
  }
}
