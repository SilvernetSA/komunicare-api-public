import { Document, Model, Schema, model, models } from 'mongoose';

export interface PlanPersistenceDocument extends Document {
  name: string;
  description?: string;
  provider: 'paypal' | 'mercadopago';
  planId: string;
  interval: string;
  intervalCount: number;
  price: number;
  currency: string;
}

const planSchema = new Schema<PlanPersistenceDocument>({
  name: { type: String, required: true },
  description: { type: String },
  provider: { type: String, enum: ['paypal', 'mercadopago'], required: true },
  planId: { type: String, required: true, unique: true },
  interval: { type: String, required: true },
  intervalCount: { type: Number, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
});

export const PlanPersistenceModel =
  (models.Plan as Model<PlanPersistenceDocument>) ||
  model<PlanPersistenceDocument>('Plan', planSchema);
