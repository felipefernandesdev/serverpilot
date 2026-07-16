import { IsString, IsIn, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateFilterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(['contains', 'equals', 'regex'])
  rule!: string;

  @IsString()
  @IsNotEmpty()
  pattern!: string;

  @IsString()
  @IsIn(['discard', 'forward', 'pipe'])
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  destination?: string;
}
