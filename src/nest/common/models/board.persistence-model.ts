import mongoose, { Document, Model, Schema } from 'mongoose';

import {
  DEFAULT_CELL_SIZE,
  DEFAULT_FORMAT,
  DEFAULT_LANG,
} from './persistence.constants';
import { UserPersistenceEntity } from './user.persistence-model';

export interface BoardPersistenceDocument extends Document {
  name: string;
  author: string;
  email: string;
  isPublic?: boolean;
  publicSourceId?: string;
  tiles?: unknown[];
  cellSize?: string;
  locale?: string;
  caption?: string;
  format?: string;
  lastEdited?: Date;
  description?: string;
  isFixed?: boolean;
  grid?: unknown;
  skipValidation(): boolean;
  [key: string]: any;
}

export interface BoardPersistenceModel extends Model<BoardPersistenceDocument> {}

const boardSchema = new Schema<BoardPersistenceDocument, BoardPersistenceModel>(
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
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicSourceId: {
      type: String,
      required: false,
      trim: true,
    },
    tiles: {
      type: Array,
    },
    cellSize: {
      type: String,
      default: DEFAULT_CELL_SIZE,
    },
    locale: {
      type: String,
      default: DEFAULT_LANG,
    },
    caption: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      default: DEFAULT_FORMAT,
    },
    lastEdited: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      default: '',
    },
    isFixed: {
      type: Boolean,
      default: false,
    },
    grid: {
      type: Schema.Types.Mixed,
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

const hasContent = (value?: string | unknown[]): boolean => Boolean(value?.length);

boardSchema.path('name').validate(function (this: BoardPersistenceDocument) {
  return this.skipValidation() || hasContent(this.name);
}, 'Name cannot be blank');

boardSchema.path('email').validate(function (this: BoardPersistenceDocument) {
  return this.skipValidation() || hasContent(this.email);
}, 'User email cannot be blank');

boardSchema.path('email').validate(
  async function (this: BoardPersistenceDocument, email: string) {
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

boardSchema.pre<BoardPersistenceDocument>('save', function (next) {
  if (this.isNew) {
    this.lastEdited = new Date();
  }
  next();
});

boardSchema.methods.skipValidation = () => false;

export const BoardPersistenceEntity =
  ((mongoose.models.Board as BoardPersistenceModel) ||
    mongoose.model<BoardPersistenceDocument, BoardPersistenceModel>(
      'Board',
      boardSchema,
    )) as BoardPersistenceModel;
