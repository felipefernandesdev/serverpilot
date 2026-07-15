import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileManagerService } from './file-manager.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileManagerController {
  constructor(private readonly fileManagerService: FileManagerService) {}

  @Get()
  async listFiles(@Request() req: any, @Query('path') path = '/') {
    return this.fileManagerService.listFiles(req.user.sub, path);
  }

  @Get('content')
  async getFileContent(@Request() req: any, @Query('path') path: string) {
    return this.fileManagerService.getFileContent(req.user.sub, path);
  }

  @Post('mkdir')
  @HttpCode(HttpStatus.CREATED)
  async createDirectory(
    @Request() req: any,
    @Body('path') path: string,
  ) {
    return this.fileManagerService.createDirectory(req.user.sub, path);
  }

  @Post('write')
  @HttpCode(HttpStatus.OK)
  async writeFile(
    @Request() req: any,
    @Body('path') path: string,
    @Body('content') content: string,
  ) {
    return this.fileManagerService.writeFile(req.user.sub, path, content);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@Request() req: any, @Query('path') path: string) {
    await this.fileManagerService.deleteFile(req.user.sub, path);
  }

  @Post('rename')
  @HttpCode(HttpStatus.OK)
  async renameFile(
    @Request() req: any,
    @Body('oldPath') oldPath: string,
    @Body('newPath') newPath: string,
  ) {
    return this.fileManagerService.renameFile(req.user.sub, oldPath, newPath);
  }

  @Get('download')
  async downloadFile(@Request() req: any, @Query('path') path: string) {
    return this.fileManagerService.downloadFile(req.user.sub, path);
  }
}
