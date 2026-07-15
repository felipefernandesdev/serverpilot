import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Clean all tables in reverse order
    const models = Object.keys(this).filter(
      (key) => !key.startsWith('_') && typeof this[key as keyof this] === 'object',
    );

    for (const model of models) {
      try {
        await (this[model as keyof this] as any).deleteMany();
      } catch (error) {
        // Model doesn't exist, skip
      }
    }
  }
}
