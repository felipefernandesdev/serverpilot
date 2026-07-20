import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WpInstallerService } from './wp-installer.service';

@Controller('wp')
@UseGuards(JwtAuthGuard)
export class WpInstallerController {
  constructor(private readonly wpInstaller: WpInstallerService) {}

  @Post('install/:accountId')
  @HttpCode(HttpStatus.OK)
  async install(@Param('accountId') accountId: string) {
    return this.wpInstaller.install(accountId);
  }
}
