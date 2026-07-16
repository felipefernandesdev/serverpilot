import { IsString, MinLength, IsInt, Min, Max, IsOptional } from 'class-validator';

export class UpdateEmailDto {
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsInt()
  @Min(1)
  @Max(102400)
  @IsOptional()
  quota?: number;
}
