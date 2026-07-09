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
  loginAttempts?: number;
  lockedUntil?: Date | null;
  isManuallyBlocked?: boolean;
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
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    isManuallyBlocked: {
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

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000;

userSchema.statics.authenticate = async function (
  email: string,
  password: string,
  skipBoards = false,
): Promise<UserPersistenceDocument> {
  const userForCheck = await this.findOne({ email }).exec();
  if (!userForCheck) {
    const error: any = new Error('User not found.');
    error.status = 401;
    throw error;
  }

  if (userForCheck.isManuallyBlocked) {
    const error: any = new Error('Account has been blocked. Contact an administrator.');
    error.status = 403;
    throw error;
  }

  if (userForCheck.lockedUntil && userForCheck.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((userForCheck.lockedUntil.getTime() - Date.now()) / 60000);
    const error: any = new Error(`Account temporarily locked. Try again in ${minutesLeft} minute(s).`);
    error.status = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, userForCheck.password || '');
  if (!isMatch) {
    const attempts = (userForCheck.loginAttempts || 0) + 1;
    const update: Record<string, any> = { loginAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      update.loginAttempts = 0;
    }

    await this.updateOne({ email }, update).exec();

    const remaining = MAX_LOGIN_ATTEMPTS - attempts;
    const suffix = remaining > 0 ? ` (${remaining} attempt(s) left before lockout)` : ' Account locked for 24 hours.';
    const error: any = new Error(`Wrong email or password.${suffix}`);
    error.status = 401;
    throw error;
  }

  await this.updateOne({ email }, { loginAttempts: 0, lockedUntil: null }).exec();

  let query = this.findOne({ email });
  if (!skipBoards) {
    query = query.populate('communicators').populate('boards');
  }
  query = query.populate('settings');

  return query.exec() as Promise<UserPersistenceDocument>;
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
