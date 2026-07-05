import { Document, Model, Schema, model, models } from 'mongoose';

export interface LanguagePersistenceDocument extends Document {
  locale: string;
  displayName: string;
  skin?: string;
  hair?: string;
  arabic: boolean;
}

const languageSchema = new Schema<LanguagePersistenceDocument>({
  locale: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  skin: {
    type: String,
    trim: true,
  },
  hair: {
    type: String,
    trim: true,
  },
  arabic: {
    type: Boolean,
    default: false,
  },
});

export const LanguagePersistenceModel =
  (models.Language as Model<LanguagePersistenceDocument>) ||
  model<LanguagePersistenceDocument>('Language', languageSchema);
