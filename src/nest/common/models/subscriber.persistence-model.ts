import mongoose, { Document, Model, Schema } from 'mongoose';

export interface SubscriberPersistenceDocument extends Document {
  userId: string;
  status: string;
  expirationDate?: Date;
  cancelledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubscriberPersistenceModel
  extends Model<SubscriberPersistenceDocument> {
  getByUserId(userId: string): Promise<SubscriberPersistenceDocument | null>;
}

const subscriberSchema = new Schema<SubscriberPersistenceDocument>(
  {
    userId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: false,
    },
    cancelledAt: {
      type: Date,
      required: false,
    },
  },
  {
    strict: false,
    timestamps: true,
  },
);

subscriberSchema.statics.getByUserId = async function (
  userId: string,
): Promise<SubscriberPersistenceDocument | null> {
  try {
    return await SubscriberPersistenceEntity.findOne({ userId }).exec();
  } catch {
    return null;
  }
};

export const SubscriberPersistenceEntity =
  ((mongoose.models.Subscribers as SubscriberPersistenceModel) ||
    mongoose.model<SubscriberPersistenceDocument, SubscriberPersistenceModel>(
      'Subscribers',
      subscriberSchema,
    )) as SubscriberPersistenceModel;
