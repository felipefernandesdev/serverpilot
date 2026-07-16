import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SitePreviewService } from './site-preview.service';

@Controller('site')
export class SitePreviewController {
  constructor(
    private readonly sitePreviewService: SitePreviewService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('preview/token')
  @UseGuards(JwtAuthGuard)
  async getPreviewToken(@Request() req: any) {
    const token = await this.sitePreviewService.generatePreviewToken(req.user.sub);
    return { token };
  }

  @Get('preview')
  async previewSite(
    @Query('token') token: string,
    @Query('path') path: string | undefined,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('Preview token required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired preview token');
    }

    if (payload.type !== 'preview') {
      throw new UnauthorizedException('Invalid token type');
    }

    const { content, mimeType } = await this.sitePreviewService.getFile(payload.sub, path || '/');

    res.set({
      'Content-Type': mimeType,
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.send(content);
  }
}
