import mongoose, { Document, Model, Schema } from 'mongoose';

import { COMMUNICATOR_COPY_SOURCES } from '../communicator-copy-source.util';
import { sanitizeDefaultBoardsIncluded } from '../default-boards-included.util';
import { UserPersistenceEntity } from './user.persistence-model';

export interface CommunicatorPersistenceDocument extends Document {
  name: string;
  author: string;
  email: string;
  description?: string;
  rootBoard: string;
  boards: string[];
  defaultBoardsIncluded?: Record<string, unknown>[];
  copySource?: string;
  copySourceCommunicatorId?: string;
  skipValidation(): boolean;
  [key: string]: any;
}

export interface CommunicatorPersistenceModel
  extends Model<CommunicatorPersistenceDocument> {}

const communicatorSchema = new Schema<
  CommunicatorPersistenceDocument,
  CommunicatorPersistenceModel
>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    rootBoard: {
      type: String,
      required: true,
      trim: true,
    },
    boards: [
      {
        type: String,
        required: true,
      },
    ],
    defaultBoardsIncluded: [
      {
        type: Object,
        required: false,
      },
    ],
    copySource: {
      type: String,
      enum: COMMUNICATOR_COPY_SOURCES,
      required: false,
      trim: true,
    },
    copySourceCommunicatorId: {
      type: String,
      required: false,
      trim: true,
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
        result.defaultBoardsIncluded = sanitizeDefaultBoardsIncluded(
          result.defaultBoardsIncluded,
        );
      },
    },
  },
);

const hasContent = (value?: string | unknown[]): boolean => Boolean(value?.length);

communicatorSchema.path('name').validate(function (
  this: CommunicatorPersistenceDocument,
) {
  return this.skipValidation() || hasContent(this.name);
}, 'Name cannot be blank');

communicatorSchema.path('author').validate(function (
  this: CommunicatorPersistenceDocument,
) {
  return this.skipValidation() || hasContent(this.author);
}, 'Author cannot be blank');

communicatorSchema.path('email').validate(function (
  this: CommunicatorPersistenceDocument,
) {
  return this.skipValidation() || hasContent(this.email);
}, "Author's email cannot be blank");

communicatorSchema.path('email').validate(
  async function (this: CommunicatorPersistenceDocument, email: string) {
    if (this.skipValidation()) {
      return true;
    }

    if (this.isNew || this.isModified('email')) {
      const count = await UserPersistenceEntity.countDocuments({ email }).exec();
      return count > 0;
    }

    return true;
  },
  'User email does not exist in database',
);

communicatorSchema.path('boards').validate(function (
  this: CommunicatorPersistenceDocument,
) {
  return this.skipValidation() || hasContent(this.boards);
}, 'Boards length should be greater than 0');

communicatorSchema.path('rootBoard').validate(function (
  this: CommunicatorPersistenceDocument,
) {
  return this.skipValidation() || hasContent(this.rootBoard);
}, 'RootBoard cannot be blank');

communicatorSchema.path('rootBoard').validate(function (
  this: CommunicatorPersistenceDocument,
  rootBoard: string,
) {
  return this.skipValidation() || this.boards.includes(rootBoard);
}, 'Communicator rootBoard should exist in boards field');

communicatorSchema.pre<CommunicatorPersistenceDocument>('save', function (next) {
  this.defaultBoardsIncluded = sanitizeDefaultBoardsIncluded(
    this.defaultBoardsIncluded,
  );
  next();
});

communicatorSchema.methods.skipValidation = () => false;

export const CommunicatorPersistenceEntity =
  ((mongoose.models.Communicator as CommunicatorPersistenceModel) ||
    mongoose.model<
      CommunicatorPersistenceDocument,
      CommunicatorPersistenceModel
    >('Communicator', communicatorSchema)) as CommunicatorPersistenceModel;
