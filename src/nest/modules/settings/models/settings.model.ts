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
    example: { vocalizeFolders: true },
  })
  navigation?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [{ deviceId: 'MacBook-Pro-Chrome', lastLogin: '2026-04-14T10:00:00.000Z' }],
  })
  devices?: Array<Record<string, unknown>>;
}

const ALLOWED_NAVIGATION_KEYS = new Set([
  'active',
  'shareShowActive',
  'bigScrollButtonsActive',
  'navigationButtonsStyle',
  'caBackButtonActive',
  'quickUnlockActive',
  'removeOutputActive',
  'vocalizeFolders',
]);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const sanitizeNavigation = (value: unknown): Record<string, unknown> | undefined => {
  const navigation = asRecord(value);
  if (!navigation) {
    return undefined;
  }

  const sanitized = Object.entries(navigation).reduce<Record<string, unknown>>(
    (result, [key, entryValue]) => {
      if (ALLOWED_NAVIGATION_KEYS.has(key)) {
        result[key] = entryValue;
      }
      return result;
    },
    {},
  );

  return Object.keys(sanitized).length ? sanitized : {};
};

export const sanitizePublicSettingsModel = (value: unknown): SettingsModel => {
  const settings = asRecord(value) || {};
  const sanitized: SettingsModel = {};

  if (settings.id !== undefined) {
    sanitized.id = String(settings.id);
  }

  if (settings.user !== undefined) {
    sanitized.user = String(settings.user);
  }

  if (asRecord(settings.language)) {
    sanitized.language = settings.language as Record<string, unknown>;
  }

  if (asRecord(settings.speech)) {
    sanitized.speech = settings.speech as Record<string, unknown>;
  }

  if (asRecord(settings.display)) {
    sanitized.display = settings.display as Record<string, unknown>;
  }

  const navigation = sanitizeNavigation(settings.navigation);
  if (navigation) {
    sanitized.navigation = navigation;
  }

  if (Array.isArray(settings.devices)) {
    sanitized.devices = settings.devices.filter(
      (device): device is Record<string, unknown> =>
        Boolean(device) && typeof device === 'object' && !Array.isArray(device),
    );
  }

  return sanitized;
};

export const sanitizePublicSettingsUpdate = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  if (asRecord(value.language)) {
    sanitized.language = value.language;
  }

  if (asRecord(value.speech)) {
    sanitized.speech = value.speech;
  }

  if (asRecord(value.display)) {
    sanitized.display = value.display;
  }

  if (value.navigation !== undefined) {
    const navigation = sanitizeNavigation(value.navigation);
    if (navigation !== undefined) {
      sanitized.navigation = navigation;
    }
  }

  if (Array.isArray(value.devices)) {
    sanitized.devices = value.devices.filter(
      (device): device is Record<string, unknown> =>
        Boolean(device) && typeof device === 'object' && !Array.isArray(device),
    );
  }

  return sanitized;
};
