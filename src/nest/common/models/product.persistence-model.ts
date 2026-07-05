import { Document, Model, Schema, model, models } from 'mongoose';

export interface ProductPersistenceDocument extends Document {
  productId: string;
  name: string;
  description: string;
  platform: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema = new Schema<ProductPersistenceDocument>(
  {
    productId: {
      type: String,
      unique: true,
      dropDups: true,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ProductPersistenceModel =
  (models.Product as Model<ProductPersistenceDocument>) ||
  model<ProductPersistenceDocument>('Product', productSchema);
