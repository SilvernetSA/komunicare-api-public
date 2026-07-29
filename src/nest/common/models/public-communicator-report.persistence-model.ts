import mongoose, { Document, Model, Schema } from 'mongoose';

export interface PublicCommunicatorReportWhistleblower {
  name?: string;
  email?: string;
  language?: string;
}

export interface PublicCommunicatorReportPersistenceDocument extends Document {
  communicatorId: string;
  communicatorName: string;
  author: string;
  ownerEmail: string;
  reason: string;
  url: string;
  whistleblower: PublicCommunicatorReportWhistleblower;
  status: string;
  adminComment?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface PublicCommunicatorReportPersistenceModel
  extends Model<PublicCommunicatorReportPersistenceDocument> {}

const whistleblowerSchema = new Schema<PublicCommunicatorReportWhistleblower>(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const publicCommunicatorReportSchema = new Schema<
  PublicCommunicatorReportPersistenceDocument,
  PublicCommunicatorReportPersistenceModel
>(
  {
    communicatorId: {
      type: String,
      required: true,
      trim: true,
    },
    communicatorName: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    whistleblower: {
      type: whistleblowerSchema,
      default: {},
    },
    status: {
      type: String,
      default: 'pending',
      trim: true,
    },
    adminComment: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
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

export const PublicCommunicatorReportPersistenceEntity =
  ((mongoose.models.PublicCommunicatorReport as PublicCommunicatorReportPersistenceModel) ||
    mongoose.model<
      PublicCommunicatorReportPersistenceDocument,
      PublicCommunicatorReportPersistenceModel
    >('PublicCommunicatorReport', publicCommunicatorReportSchema)) as PublicCommunicatorReportPersistenceModel;
