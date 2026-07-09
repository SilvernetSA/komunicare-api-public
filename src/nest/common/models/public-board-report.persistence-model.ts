import mongoose, { Document, Model, Schema } from 'mongoose';

export interface PublicBoardReportWhistleblower {
  name?: string;
  email?: string;
  language?: string;
}

export interface PublicBoardReportPersistenceDocument extends Document {
  boardId: string;
  boardName: string;
  author: string;
  ownerEmail: string;
  reason: string;
  url: string;
  whistleblower?: PublicBoardReportWhistleblower;
  status: string;
  createdAt: Date;
}

export interface PublicBoardReportPersistenceModel
  extends Model<PublicBoardReportPersistenceDocument> {}

const whistleblowerSchema = new Schema<PublicBoardReportWhistleblower>(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    language: { type: String, trim: true },
  },
  { _id: false },
);

const publicBoardReportSchema = new Schema<
  PublicBoardReportPersistenceDocument,
  PublicBoardReportPersistenceModel
>(
  {
    boardId: { type: String, required: true, trim: true },
    boardName: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    whistleblower: { type: whistleblowerSchema, required: false },
    status: { type: String, default: 'pending', trim: true },
    createdAt: { type: Date, default: Date.now },
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

export const PublicBoardReportPersistenceEntity =
  ((mongoose.models.PublicBoardReport as PublicBoardReportPersistenceModel) ||
    mongoose.model<
      PublicBoardReportPersistenceDocument,
      PublicBoardReportPersistenceModel
    >(
      'PublicBoardReport',
      publicBoardReportSchema,
    )) as PublicBoardReportPersistenceModel;
