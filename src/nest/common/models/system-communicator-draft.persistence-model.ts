import mongoose, { Schema } from 'mongoose';

const SystemCommunicatorDraftSchema = new Schema(
  {
    communicatorId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['draft', 'discarded'], default: 'draft' },
    createdBy: { type: String },
    // Partial updates keyed by boardId — merged with live on publish
    boardChanges: { type: Schema.Types.Mixed, default: {} },
    // Boards not yet in the DB — created on publish
    newBoards: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

export const SystemCommunicatorDraftPersistenceEntity = mongoose.model(
  'system_communicator_drafts',
  SystemCommunicatorDraftSchema,
);
