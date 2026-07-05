import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdQueryDto {
  @ApiProperty({ example: '6831ef4d3a2b47506a9f61f3' })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
