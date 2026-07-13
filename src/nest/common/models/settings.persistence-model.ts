import mongoose, { Document, Model, Schema } from 'mongoose';

export interface SettingsPersistenceDevice {
  deviceId: string;
  lastLogin: Date;
}

export interface SettingsPersistenceDocument extends Document {
  language?: Record<string, unknown>;
  speech?: Record<string, unknown>;
  display?: Record<string, unknown>;
  navigation?: Record<string, unknown>;
  user: mongoose.Types.ObjectId;
  devices?: SettingsPersistenceDevice[];
  registerDevice(deviceId: string): Promise<SettingsPersistenceDocument>;
}

const settingsSchema = new Schema<SettingsPersistenceDocument>(
  {
    language: {},
    speech: {},
    display: {},
    navigation: {
      active: { type: Boolean, default: false },
      shareShowActive: { type: Boolean, default: false },
      bigScrollButtonsActive: { type: Boolean, default: false },
      navigationButtonsStyle: { type: String, default: 'sides' },
      caBackButtonActive: { type: Boolean, default: false },
      quickUnlockActive: { type: Boolean, default: false },
      removeOutputActive: { type: Boolean, default: false },
      vocalizeFolders: { type: Boolean, default: true },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    devices: {
      type: [
        {
          deviceId: { type: String, required: true },
          lastLogin: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_document, result) => {
        result.id = result._id;
        delete result._id;
      },
    },
  },
);

settingsSchema.methods.registerDevice = async function (
  this: SettingsPersistenceDocument,
  deviceId: string,
): Promise<SettingsPersistenceDocument> {
  if (!this.devices) {
    this.devices = [];
  }

  const index = this.devices.findIndex((device) => device.deviceId === deviceId);
  if (index >= 0) {
    this.devices[index].lastLogin = new Date();
  } else if (this.devices.length < 2) {
    this.devices.push({ deviceId, lastLogin: new Date() });
  } else {
    throw new Error('Max devices reached');
  }

  await this.save();
  return this;
};

settingsSchema.virtual('deviceId').set(function (
  this: SettingsPersistenceDocument,
  deviceId: string,
) {
  this.registerDevice(deviceId).catch(() => undefined);
});

export const SettingsPersistenceModel =
  (mongoose.models.Settings as Model<SettingsPersistenceDocument>) ||
  mongoose.model<SettingsPersistenceDocument>('Settings', settingsSchema);
