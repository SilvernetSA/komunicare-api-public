import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  key: string;
  value: unknown;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const AppConfigModel = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
