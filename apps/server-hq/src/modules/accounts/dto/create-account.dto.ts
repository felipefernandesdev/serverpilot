import { IsString, IsEmail, MinLength, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @IsEmail()
  @IsNotEmpty()
  domain: string;

  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}
