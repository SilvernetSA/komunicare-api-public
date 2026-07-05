import { Document, Model, Schema, model, models } from 'mongoose';

export interface MessageCategoryPersistenceDocument extends Document {
  key: string;
  label: string;
}

export const DEFAULT_MESSAGE_CATEGORIES: Array<
  Pick<MessageCategoryPersistenceDocument, 'key' | 'label'>
> = [
  { key: 'GREETINGS', label: 'Saludos' },
  { key: 'NEEDS', label: 'Necesidades' },
  { key: 'EMERGENCY', label: 'Emergencias' },
  { key: 'FEELINGS', label: 'Sentimientos' },
  { key: 'QUESTIONS', label: 'Preguntas' },
  { key: 'RESPONSES', label: 'Respuestas' },
  { key: 'SOCIAL', label: 'Social' },
  { key: 'FOOD_DRINK', label: 'Comida & Bebida' },
  { key: 'TOILET', label: 'Baño' },
  { key: 'PAIN', label: 'Dolor' },
];

const messageCategorySchema = new Schema<MessageCategoryPersistenceDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_document, result) => {
        result.id = result._id;
        delete result._id;
      },
    },
  },
);

export const MessageCategoryPersistenceModel =
  (models.MessageCategory as Model<MessageCategoryPersistenceDocument>) ||
  model<MessageCategoryPersistenceDocument>(
    'MessageCategory',
    messageCategorySchema,
  );
