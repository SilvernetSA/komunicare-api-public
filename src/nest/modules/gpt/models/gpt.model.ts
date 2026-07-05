import { ApiProperty } from '@nestjs/swagger';

export class EditPhraseResponseModel {
  @ApiProperty({ example: 'Quiero tomar agua' })
  phrase!: string;
}

export class EditPhraseForKeyboardResponseModel {
  @ApiProperty({ type: String, isArray: true, example: ['Quiero agua', 'Agua por favor'] })
  phrases!: string[];
}
