import { IsString, IsEmail, IsOptional, IsUUID, IsBoolean, IsNumber } from 'class-validator';

export class UpdateAccountDto {
  @IsEmail()
  @IsOptional()
  domain?: string;

  @IsUUID()
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
