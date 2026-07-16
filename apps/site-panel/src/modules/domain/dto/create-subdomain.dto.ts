import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubdomainDto {
  @IsString()
  @IsNotEmpty()
  subdomain!: string;

  @IsString()
  @IsOptional()
  documentRoot?: string;
}
