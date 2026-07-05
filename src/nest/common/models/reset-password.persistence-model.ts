import { Document, Model, Schema, model, models } from 'mongoose';

export interface ResetPasswordPersistenceDocument extends Document {
  userId: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  status: boolean;
}

const resetPasswordSchema = new Schema<ResetPasswordPersistenceDocument>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const ResetPasswordPersistenceModel =
  (models.ResetPassword as Model<ResetPasswordPersistenceDocument>) ||
  model<ResetPasswordPersistenceDocument>(
    'ResetPassword',
    resetPasswordSchema,
  );
