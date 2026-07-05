import { ApiProperty } from '@nestjs/swagger';

export class LocationModel {
  @ApiProperty({ example: 'Argentina' })
  country!: string;

  @ApiProperty({ example: 'AR' })
  countryCode!: string;

  @ApiProperty({ example: 'Buenos Aires' })
  region!: string;

  @ApiProperty({ example: 'La Plata' })
  city!: string;
}
