import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseModel {
  @ApiProperty({
    type: String,
    example: 'https://cdn.komuni.care/media/file.png',
    nullable: true,
  })
  url!: string | null;
}
