import { IsString, IsEmail, MinLength, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsInt()
  @Min(1)
  @Max(102400)
  @IsOptional()
  quota?: number;
}
