import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateForwarderDto {
  @IsEmail()
  @IsNotEmpty()
  source!: string;

  @IsEmail()
  @IsNotEmpty()
  destination!: string;
}
