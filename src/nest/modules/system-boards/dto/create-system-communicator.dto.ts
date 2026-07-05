import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSystemCommunicatorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
