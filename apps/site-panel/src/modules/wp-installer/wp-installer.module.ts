import { Module } from '@nestjs/common';
import { WpInstallerController } from './wp-installer.controller';
import { WpInstallerService } from './wp-installer.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WpInstallerController],
  providers: [WpInstallerService],
})
export class WpInstallerModule {}
