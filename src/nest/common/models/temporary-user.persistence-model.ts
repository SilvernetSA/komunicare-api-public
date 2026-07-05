import { Document, Model, Schema, model, models } from 'mongoose';

export interface TemporaryUserPersistenceDocument extends Document {
  name: string;
  email?: string;
  password?: string;
  GENERATED_VERIFYING_URL?: string;
  gender?: string;
}

const temporaryUserSchema = new Schema<TemporaryUserPersistenceDocument>(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    GENERATED_VERIFYING_URL: {
      type: String,
    },
    gender: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const TemporaryUserPersistenceModel =
  (models.Temporary_User as Model<TemporaryUserPersistenceDocument>) ||
  model<TemporaryUserPersistenceDocument>(
    'Temporary_User',
    temporaryUserSchema,
  );
