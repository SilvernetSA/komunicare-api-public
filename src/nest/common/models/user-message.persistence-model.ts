import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface UserMessagePersistenceDocument extends Document {
  user: Types.ObjectId;
  text: string;
  locale?: string;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserMessagePersistenceModel
  extends Model<UserMessagePersistenceDocument> {
  listByUser(
    userId: string | Types.ObjectId,
  ): Promise<UserMessagePersistenceDocument[]>;
}

const userMessageSchema = new Schema<
  UserMessagePersistenceDocument,
  UserMessagePersistenceModel
>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true },
    locale: { type: String, required: false, trim: true },
    category: { type: String, required: false, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_document, result) => {
        result.id = result._id;
        delete result._id;
      },
    },
  },
);

userMessageSchema.statics.listByUser = function (userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 }).exec();
};

export const UserMessagePersistenceEntity =
  ((mongoose.models.UserMessage as UserMessagePersistenceModel) ||
    mongoose.model<UserMessagePersistenceDocument, UserMessagePersistenceModel>(
      'UserMessage',
      userMessageSchema,
    )) as UserMessagePersistenceModel;
