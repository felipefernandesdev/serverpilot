import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SuspendAccountDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsOptional()
  message?: string;
}
