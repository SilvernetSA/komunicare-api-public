import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettingsModel {
  [key: string]: unknown;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  id?: string;

  @ApiPropertyOptional({ example: '6831ef4d3a2b47506a9f61f3' })
  user?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { locale: 'es-AR' },
  })
  language?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { voiceURI: 'es-AR-ElenaNeural', pitch: 1, rate: 1 },
  })
  speech?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { theme: 'light' },
  })
  display?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { enabled: true, dwellTime: 1500 },
  })
  faceTracking?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { vocalizeFolders: true, liveMode: false },
  })
  navigation?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'EYE' })
  selectedKeyboard?: string;

  @ApiPropertyOptional({ example: 'HORIZONTAL' })
  keyboardDistribution?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [{ deviceId: 'MacBook-Pro-Chrome', lastLogin: '2026-04-14T10:00:00.000Z' }],
  })
  devices?: Array<Record<string, unknown>>;
}
