import { IsString, IsOptional, IsBoolean, IsNumber, Matches } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
  domain?: string;

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  diskUsed?: number;

  @IsNumber()
  @IsOptional()
  bandwidthUsed?: number;
}
