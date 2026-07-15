import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(100)
  @IsOptional()
  diskSpace?: number;

  @IsNumber()
  @Min(100)
  @IsOptional()
  bandwidth?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  emailAccounts?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  databases?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  subdomains?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ftpAccounts?: number;

  @IsBoolean()
  @IsOptional()
  ssl?: boolean;

  @IsBoolean()
  @IsOptional()
  sshAccess?: boolean;
}
