import { IsString, MinLength, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
  domain!: string;

  @IsString()
  @IsNotEmpty()
  packageId!: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
