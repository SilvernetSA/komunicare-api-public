type KeyboardSettingsUpdate = {
  $set: Record<string, unknown>;
  $unset?: Record<string, 1>;
};

const ALLOWED_INPUT_MODES = new Set(['EYE', 'POINTER', 'STATIC', 'HORIZONTAL_STATIC']);
const ALLOWED_DISTRIBUTIONS = new Set(['VERTICAL', 'HORIZONTAL']);
const ALLOWED_FONT_SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const ALLOWED_SPEAK_GESTURES = new Set(['look_up', 'blink']);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export const buildKeyboardSettingsUpdate = (
  userId: string,
  payload: Record<string, unknown>,
): KeyboardSettingsUpdate => {
  const inputMode =
    typeof payload.inputMode === 'string' && ALLOWED_INPUT_MODES.has(payload.inputMode)
      ? payload.inputMode
      : undefined;
  const isEyeKeyboard = inputMode === 'EYE';

  const $set: Record<string, unknown> = {
    user: userId,
    updatedAt: new Date(),
  };

  if (inputMode) {
    $set.inputMode = inputMode;
  }

  if (
    isEyeKeyboard &&
    typeof payload.distribution === 'string' &&
    ALLOWED_DISTRIBUTIONS.has(payload.distribution)
  ) {
    $set.distribution = payload.distribution;
  }

  if (
    isEyeKeyboard &&
    typeof payload.keyboardSpeakGesture === 'string' &&
    ALLOWED_SPEAK_GESTURES.has(payload.keyboardSpeakGesture)
  ) {
    $set.keyboardSpeakGesture = payload.keyboardSpeakGesture;
  }

  if (typeof payload.contactEmail === 'string') {
    $set.contactEmail = payload.contactEmail.trim();
  } else if (payload.contactEmail === null || payload.contactEmail === undefined) {
    $set.contactEmail = undefined;
  }

  const eyeSource = asRecord(payload.eyeSource);
  if (
    eyeSource &&
    typeof eyeSource.leftEye === 'boolean' &&
    typeof eyeSource.rightEye === 'boolean'
  ) {
    $set.eyeSource = {
      leftEye: eyeSource.leftEye,
      rightEye: eyeSource.rightEye,
    };
  }

  if (
    typeof payload.keyFontSize === 'string' &&
    ALLOWED_FONT_SIZES.has(payload.keyFontSize)
  ) {
    $set.keyFontSize = payload.keyFontSize;
  }

  if (
    typeof payload.phraseFontSize === 'string' &&
    ALLOWED_FONT_SIZES.has(payload.phraseFontSize)
  ) {
    $set.phraseFontSize = payload.phraseFontSize;
  }

  if (typeof payload.isDarkTheme === 'boolean') {
    $set.isDarkTheme = payload.isDarkTheme;
  }

  const gestureDetection = asRecord(payload.gestureDetection);
  if (isEyeKeyboard && gestureDetection) {
    $set.gestureDetection = gestureDetection;
  }

  const $unset = isEyeKeyboard
    ? undefined
    : {
        distribution: 1 as const,
        keyboardSpeakGesture: 1 as const,
        gestureDetection: 1 as const,
      };

  return $unset ? { $set, $unset } : { $set };
};
