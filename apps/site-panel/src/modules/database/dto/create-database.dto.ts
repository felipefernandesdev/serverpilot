import { IsString, IsIn, IsNotEmpty, MinLength } from 'class-validator';

export class CreateDatabaseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(['mysql', 'postgresql'])
  type!: string;
}

export class CreateDatabaseUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  privileges!: string;
}
