import bcrypt from 'bcryptjs';
import mongoose, { Document, Model, Schema, Types } from 'mongoose';

import { DEFAULT_LANG } from './persistence.constants';

export interface UserPersistenceDocument extends Document {
  name: string;
  email: string;
  role: string;
  birthdate?: Date;
  provider?: string;
  locale?: string;
  password: string;
  lastlogin?: Date;
  passwordLastChanged?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  emailConfirmed?: boolean;
  emailConfirmToken?: string;
  emailConfirmExpires?: Date;
  location?: {
    ip?: string;
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
  };
  isFirstLogin?: boolean;
  gender?: string;
  isByBackOffice?: boolean;
  communicators?: unknown[];
  boards?: unknown[];
  settings?: unknown;
  isAdmin?: boolean;
  [key: string]: any;
}

export interface UserPersistenceModel extends Model<UserPersistenceDocument> {
  authenticate(
    email: string,
    password: string,
    skipBoards?: boolean,
  ): Promise<UserPersistenceDocument>;
  getById(id: string | Types.ObjectId): Promise<Record<string, unknown> | null>;
}

const userSchema = new Schema<UserPersistenceDocument, UserPersistenceModel>(
  {
    name: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      default: 'user',
      required: true,
      trim: true,
    },
    birthdate: {
      type: Date,
      default: Date.now,
    },
    provider: {
      type: String,
      default: '',
    },
    locale: {
      type: String,
      default: DEFAULT_LANG,
    },
    password: {
      type: String,
      default: '',
    },
    lastlogin: {
      type: Date,
      default: Date.now,
    },
    passwordLastChanged: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    emailConfirmed: {
      type: Boolean,
      default: true,
    },
    emailConfirmToken: {
      type: String,
    },
    emailConfirmExpires: {
      type: Date,
    },
    location: {
      ip: String,
      country: String,
      countryCode: String,
      region: String,
      city: String,
    },
    isFirstLogin: {
      type: Boolean,
      required: false,
    },
    gender: {
      type: String,
      default: '',
    },
    isByBackOffice: {
      type: Boolean,
      default: false,
    },
  },
  {
    toObject: {
      virtuals: true,
    },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_document, result) => {
        result.id = result._id;
        delete result._id;
        delete result.password;
        if (result.authToken) {
          delete result.authToken;
        }
        if (result.location && result.location.ip) {
          delete result.location.ip;
        }
      },
    },
    timestamps: true,
  },
);

userSchema.virtual('communicators', {
  ref: 'Communicator',
  localField: 'email',
  foreignField: 'email',
});

userSchema.virtual('boards', {
  ref: 'Board',
  localField: 'email',
  foreignField: 'email',
});

userSchema.virtual('settings', {
  ref: 'Settings',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

userSchema.virtual('isAdmin').get(function (this: UserPersistenceDocument) {
  return this.role === 'admin';
});

userSchema.path('name').validate(function (this: UserPersistenceDocument) {
  return Boolean(this.name?.length);
}, 'Name cannot be blank');

userSchema.path('email').validate(function (this: UserPersistenceDocument) {
  return Boolean(this.email?.length);
}, 'Email cannot be blank');

userSchema.path('email').validate(
  async function (this: UserPersistenceDocument, email: string) {
    if (this.isNew || this.isModified('email')) {
      const count = await UserPersistenceEntity.countDocuments({ email }).exec();
      return count === 0;
    }
    return true;
  },
  'Email already exists',
);

userSchema.statics.authenticate = async function (
  email: string,
  password: string,
  skipBoards = false,
): Promise<UserPersistenceDocument> {
  let query = this.findOne({ email });
  if (!skipBoards) {
    query = query.populate('communicators').populate('boards');
  }
  query = query.populate('settings');

  const user = await query.exec();
  if (!user) {
    const error: any = new Error('User not found.');
    error.status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password || '');
  if (!isMatch) {
    const error: any = new Error('Wrong email or password.');
    error.status = 401;
    throw error;
  }

  return user;
};

userSchema.statics.getById = async function (
  id: string | Types.ObjectId,
): Promise<Record<string, unknown> | null> {
  const user = await this.findById(id)
    .populate('communicators')
    .populate('boards')
    .populate('settings')
    .exec();

  return user ? (user.toJSON() as Record<string, unknown>) : null;
};

export const UserPersistenceEntity =
  ((mongoose.models.User as UserPersistenceModel) ||
    mongoose.model<UserPersistenceDocument, UserPersistenceModel>(
      'User',
      userSchema,
    )) as UserPersistenceModel;
