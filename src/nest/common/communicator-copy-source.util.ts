export const COMMUNICATOR_COPY_SOURCES = ['komunicare'] as const;

export type CommunicatorCopySource =
  (typeof COMMUNICATOR_COPY_SOURCES)[number];

const COMMUNICATOR_COPY_SOURCE_ALIAS_MAP: Record<string, CommunicatorCopySource> =
  {
    komunicare: 'komunicare',
  };

const normalizeRawValue = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

export const normalizeCommunicatorCopySource = (
  value: unknown,
): CommunicatorCopySource | undefined => {
  const normalizedRawValue = normalizeRawValue(value);
  return COMMUNICATOR_COPY_SOURCE_ALIAS_MAP[normalizedRawValue];
};

export const isCommunicatorCopySource = (
  value: unknown,
): value is CommunicatorCopySource =>
  Boolean(normalizeCommunicatorCopySource(value));
