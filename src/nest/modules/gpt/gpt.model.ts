import { ApiProperty } from '@nestjs/swagger';

export class EditPhraseResponseModel {
  @ApiProperty({ example: 'Quiero tomar agua' })
  phrase!: string;
}
