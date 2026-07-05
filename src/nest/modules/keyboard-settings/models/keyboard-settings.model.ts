import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KeyboardSettingsModel {
  [key: string]: unknown;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiProperty({ example: '6831ef4d3a2b47506a9f61f3' })
  user!: string;

  @ApiProperty({ example: 'EYE' })
  inputMode!: string;

  @ApiPropertyOptional({ example: 'HORIZONTAL' })
  distribution?: string;

  @ApiPropertyOptional({ example: 'tap' })
  keyboardSpeakGesture?: string;

  @ApiPropertyOptional({ example: 'support@komuni.care' })
  contactEmail?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { enabled: true, threshold: 0.75 },
  })
  gestureDetection?: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { provider: 'mediapipe' },
  })
  eyeSource!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'medium' })
  keyFontSize?: string;

  @ApiPropertyOptional({ example: 'large' })
  phraseFontSize?: string;

  @ApiPropertyOptional({ example: false })
  isDarkTheme?: boolean;
}
