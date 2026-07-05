import mongoose, { Document, Model, Schema } from 'mongoose';

const KEYBOARD_INPUT_MODES = [
  'EYE',
  'POINTER',
  'STATIC',
  'HORIZONTAL_STATIC',
] as const;

const KEYBOARD_DISTRIBUTIONS = ['VERTICAL', 'HORIZONTAL'] as const;
const EYE_GESTURES = ['look_up', 'blink'] as const;
const FONT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export interface KeyboardSettingsPersistenceDocument extends Document {
  user: mongoose.Types.ObjectId;
  inputMode: (typeof KEYBOARD_INPUT_MODES)[number];
  distribution?: (typeof KEYBOARD_DISTRIBUTIONS)[number];
  keyboardSpeakGesture?: (typeof EYE_GESTURES)[number];
  contactEmail?: string;
  gestureDetection?: Record<string, unknown>;
  eyeSource: {
    leftEye: boolean;
    rightEye: boolean;
  };
  keyFontSize: (typeof FONT_SIZES)[number];
  phraseFontSize: (typeof FONT_SIZES)[number];
  isDarkTheme: boolean;
}

const gestureSettingsSchema = new Schema(
  {
    ignoreThreshold: { type: Number, required: true },
    confirmThreshold: { type: Number, required: true },
    confirmTime: { type: Number, required: true },
    cooldownTime: { type: Number, required: true },
    normalizationFactor: { type: Number, required: true },
    historyDepth: { type: Number, required: true },
  },
  { _id: false },
);

const gestureDetectionSchema = new Schema(
  {
    blink: { type: gestureSettingsSchema, required: true },
    look_left: { type: gestureSettingsSchema, required: false },
    look_right: { type: gestureSettingsSchema, required: false },
    look_up: { type: gestureSettingsSchema, required: false },
    look_down: { type: gestureSettingsSchema, required: false },
  },
  { _id: false },
);

const keyboardSettingsSchema = new Schema<KeyboardSettingsPersistenceDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      required: true,
    },
    inputMode: {
      type: String,
      enum: KEYBOARD_INPUT_MODES,
      required: true,
    },
    distribution: {
      type: String,
      enum: KEYBOARD_DISTRIBUTIONS,
      required: function (this: KeyboardSettingsPersistenceDocument) {
        return !!this && this.inputMode === 'EYE';
      },
    },
    keyboardSpeakGesture: {
      type: String,
      enum: EYE_GESTURES,
      required: function (this: KeyboardSettingsPersistenceDocument) {
        return !!this && this.inputMode === 'EYE';
      },
    },
    contactEmail: {
      type: String,
      required: false,
      trim: true,
    },
    gestureDetection: {
      type: gestureDetectionSchema,
      required: function (this: KeyboardSettingsPersistenceDocument) {
        return !!this && this.inputMode === 'EYE';
      },
    },
    eyeSource: {
      leftEye: { type: Boolean, default: true },
      rightEye: { type: Boolean, default: true },
    },
    keyFontSize: { type: String, enum: FONT_SIZES, default: 'md' },
    phraseFontSize: { type: String, enum: FONT_SIZES, default: 'md' },
    isDarkTheme: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform: (_document, result) => {
        result.id = result._id;
        delete result._id;
      },
    },
  },
);

keyboardSettingsSchema.pre('validate', function (next) {
  if (
    this.inputMode === 'EYE' &&
    !this.gestureDetection
  ) {
    return next(
      new Error('La configuración de gestos es obligatoria para teclados EYE'),
    );
  }

  if (
    this.keyboardSpeakGesture === 'look_up' &&
    !(this.inputMode === 'EYE' && this.distribution === 'HORIZONTAL')
  ) {
    return next(
      new Error('El gesto look_up sólo es válido para teclados EYE + HORIZONTAL'),
    );
  }

  next();
});

export const KeyboardSettingsPersistenceModel =
  ((mongoose.models.KeyboardSettings as Model<KeyboardSettingsPersistenceDocument>) ||
    mongoose.model<KeyboardSettingsPersistenceDocument>(
      'KeyboardSettings',
      keyboardSettingsSchema,
    )) as Model<KeyboardSettingsPersistenceDocument>;
