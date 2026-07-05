import { Document, Model, Schema, model, models } from 'mongoose';

export interface SubscriptionPersistenceDocument extends Document {
  subscriptionId: string;
  status: string;
  platform: string;
  planId: string;
  userId: string;
  expirationDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const subscriptionSchema = new Schema<SubscriptionPersistenceDocument>(
  {
    status: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expirationDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export const SubscriptionPersistenceModel =
  (models.Subscription as Model<SubscriptionPersistenceDocument>) ||
  model<SubscriptionPersistenceDocument>('Subscription', subscriptionSchema);
