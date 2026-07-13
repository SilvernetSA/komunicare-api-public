import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import moment from 'moment';
import { Request } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { issueToken } from '../../common/jwt.util';
import { BillingPersistenceService } from '../../common/billing-persistence.service';
import { LegacyAuthService } from '../../common/legacy-auth.service';
import { findIpLocation, isLocalIp } from '../../common/localize.util';
import { MailGatewayService } from '../../common/mail-gateway.service';
import { MailTemplateService } from '../../common/mail-template.service';
import { AppConfigService } from '../app-config/app-config.service';
import { CreateUserBackofficeDto } from './dto/create-user-backoffice.dto';
import { getORQuery, getQuery } from '../../common/query.util';
import { sanitizePublicSettingsModel } from '../settings/models/settings.model';
import { SubscriberRepository } from '../subscriber/subscriber.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { SendUserEmailDto } from './dto/send-user-email.dto';
import { StorePasswordDto } from './dto/store-password.dto';
import { UpdateUserBackofficeDto } from './dto/update-user-backoffice.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AuthenticatedUserModel,
  EmailAvailabilityResponse,
  PaginatedUsersResponse,
  RemoveUserBackofficeResponse,
  SendUserEmailResponse,
  UserActionResponse,
  UserModel,
} from './models/user.model';
import { UserRepository } from './user.repository';

const UPDATEABLE_FIELDS = [
  'email',
  'name',
  'birthdate',
  'locale',
  'location',
  'isFirstLogin',
  'gender',
] as const;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly mailGateway: MailGatewayService,
    private readonly mailTemplateService: MailTemplateService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly userRepository: UserRepository,
    private readonly appConfigService: AppConfigService,
    private readonly billingPersistenceService: BillingPersistenceService,
  ) {}

  async createUser(payload: CreateUserDto): Promise<UserActionResponse> {
    const existingUser = await this.userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new ConflictException({
        message:
          'You have already signed up and confirmed your account. Did you forget your password?',
      });
    }

    let temporaryUser = await this.userRepository.findTemporaryUserByEmail(
      payload.email,
    );

    if (!temporaryUser) {
      const hash = await this.hashPassword(payload.password);
      temporaryUser = this.userRepository.createTemporaryUser({
        name: payload.name,
        email: payload.email,
        password: hash,
        GENERATED_VERIFYING_URL: this.generateVerificationUrl(),
        gender: payload.gender,
      });
      await temporaryUser.save();

      await this.sendVerificationEmail(
        payload.email,
        temporaryUser.GENERATED_VERIFYING_URL,
      );

      return {
        success: 1,
        url: temporaryUser.GENERATED_VERIFYING_URL,
        message:
          'An email has been sent to you. Please check it to verify your account.',
      };
    }

    await this.sendVerificationEmail(
      payload.email,
      temporaryUser.GENERATED_VERIFYING_URL,
    );

    throw new ConflictException({
      code: 'TEMPORARY_USER_EXISTS',
      message:
        'You have already signed up. Please check your email to verify your account.',
    });
  }

  async resendVerificationEmailAction(payload: { email: string }): Promise<UserActionResponse> {
    const temporaryUser = await this.userRepository.findTemporaryUserByEmail(
      payload.email,
    );

    if (temporaryUser) {
      await this.sendVerificationEmail(
        payload.email,
        temporaryUser.GENERATED_VERIFYING_URL,
      );
    }

    return {
      success: 1,
      message: 'Verification email resent successfully if user existed.',
    };
  }

  async activateUser(url: string): Promise<UserActionResponse> {
    const temporaryUser = await this.userRepository.findTemporaryUserByVerificationUrl(
      url,
    );

    if (!temporaryUser) {
      throw new NotFoundException({
        message:
          'ERROR: confirming your temporary user FAILED, please try to login again',
        error:
          'ERROR: confirming your temporary user FAILED, please try to login again',
      });
    }

    const user = this.userRepository.createUser({
      name: temporaryUser.name,
      email: temporaryUser.email,
      password: temporaryUser.password,
      passwordLastChanged: new Date(),
      gender: temporaryUser.gender,
    });
    await this.userRepository.save(user);
    await this.userRepository.deleteTemporaryUserByVerificationUrl(url);

    return {
      success: 1,
      userid: String(user._id || user.id),
      message: 'CONFIRMED!',
    };
  }

  async loginUser(
    req: Request,
    payload: LoginUserDto,
  ): Promise<AuthenticatedUserModel> {
    const { email, password, deviceId, skipBoards = false } = payload;

    try {
      const user = await this.userRepository.authenticate(
        email,
        password,
        skipBoards,
      );

      if ((user as any).emailConfirmed === false) {
        throw new ForbiddenException({
          message: 'Email not confirmed. Please confirm your account first.',
          error: 'Email not confirmed. Please confirm your account first.',
        });
      }

      const passwordRefDate = user.passwordLastChanged || user.createdAt || new Date();
      const differenceInTime = new Date().getTime() - new Date(passwordRefDate).getTime();
      const differenceInDays = differenceInTime / (1000 * 3600 * 24);
      if (differenceInDays > 60) {
        throw new UnauthorizedException({
          message: 'Your password has expired. Please reset your password.',
          error: 'Your password has expired. Please reset your password.',
        });
      }

      const userId = String(user._id || user.id);

      if ((req as any).session) {
        (req as any).session.userId = userId;
      }

      const tokenString = issueToken({
        email,
        id: userId,
      });

      if (!user.location || !user.location.country) {
        await this.updateUserLocation(req.ip || '', user);
      }

      let settingsDoc = await this.userRepository.findSettingsDocumentByUserId(
        userId,
      );

      if (!settingsDoc) {
        settingsDoc = this.userRepository.createSettings({ user: userId });
        await settingsDoc.save();
      }

      if (deviceId) {
        try {
          await settingsDoc.registerDevice(deviceId);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          if (errorMessage === 'Max devices reached') {
            throw new ForbiddenException({
              message: 'You have reached the maximum number of devices (2).',
              error: errorMessage,
            });
          }

          throw error;
        }
      }

      const settings = await this.getSettings(user);
      const isByBackOffice = Boolean((user as any).isByBackOffice);
      const subscriber = await this.reviewSubscriber(userId, isByBackOffice);

      return this.serializeUser(user, {
        settings,
        subscriber,
        birthdate: moment(user.birthdate).format('YYYY-MM-DD'),
        authToken: tokenString,
      }) as AuthenticatedUserModel;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      const status = (error as any)?.status;
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      if (status === 401) {
        throw new UnauthorizedException({
          message,
          error: message,
        });
      }

      throw new InternalServerErrorException({
        message: 'An unexpected error occurred during login.',
        error: message,
      });
    }
  }

  async forgotPassword(payload: ForgotPasswordDto): Promise<UserActionResponse> {
    const user = await this.userRepository.findByEmail(payload.email);

    if (!user) {
      throw new NotFoundException({
        message: 'No user found with that email address. Check your input.',
      });
    }

    const previousReset = await this.userRepository.findResetPasswordByUserId(
      String(user.id || user._id),
    );

    if (previousReset) {
      await this.userRepository.deleteResetPasswordById(
        String(previousReset.id || previousReset._id),
      );
    }

    const token = randomBytes(32).toString('hex');
    const hash = await this.hashPassword(token);

    const resetPassword = this.userRepository.createResetPassword({
      userId: String(user.id || user._id),
      resetPasswordToken: hash,
      resetPasswordExpires: new Date(Date.now() + 86400 * 1000),
      status: false,
    });
    await resetPassword.save();

    const mailText = this.mailTemplateService.getResetPasswordMail(
      user.locale,
      process.env.KOMUNICARE_URL as string,
      token,
      String(user._id || user.id),
    );

    const result = await this.mailGateway.sendEmail(
      user.email,
      mailText.subject,
      mailText.html,
    );

    if ((result as any)?.error) {
      throw new InternalServerErrorException({
        message: (result as any).error,
      });
    }

    return {
      response: true,
      message: 'Password reset requested.',
    };
  }

  async storePassword(payload: StorePasswordDto): Promise<UserActionResponse> {
    const token = payload.token || payload.url;

    try {
      const resetPassword =
        await this.userRepository.findPendingResetPasswordByUserId(payload.userid);

      if (!resetPassword || !token) {
        throw new InternalServerErrorException({
          message: 'Expired time to reset password! ',
          error: 'Expired time to reset password! ',
        });
      }

      const responseBcrypt = await bcrypt.compare(
        token,
        resetPassword.resetPasswordToken,
      );

      if (!responseBcrypt) {
        throw new InternalServerErrorException({
          message: 'Error resetting user password.',
          error: 'Error resetting user password.',
        });
      }

      const hash = await this.hashPassword(payload.password);
      const user = await this.userRepository.updateById(payload.userid, {
        password: hash,
        passwordLastChanged: new Date(),
      });

      if (!user) {
        throw new NotFoundException({
          message: 'No user found with that ID.',
        });
      }

      await this.userRepository.markResetPasswordAsUsed(
        String(resetPassword.id || resetPassword._id),
      );

      return {
        success: 1,
        url: token,
        message: 'Success! We have reset your password.',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Error resetting user password.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async logoutUser(req: Request): Promise<UserActionResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    if (!(req as any).session) {
      return {
        message: 'User successfully logout',
      };
    }

    await new Promise<void>((resolve, reject) => {
      (req as any).session.destroy((error: Error | null) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }).catch((error) => {
      throw new InternalServerErrorException({
        message: 'Error removing session .',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return {
      message: 'User successfully logout',
    };
  }

  async sendUserEmail(
    req: Request,
    payload: SendUserEmailDto,
  ): Promise<SendUserEmailResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    const user = await this.userRepository.findByEmailWithoutPopulate(payload.to);

    if (!user) {
      throw new NotFoundException({
        message: `No se encontró un usuario con el email ${payload.to}.`,
      });
    }

    const result = await this.mailGateway.sendEmail(
      payload.to,
      payload.subject,
      payload.html,
    );

    if ((result as any)?.error) {
      throw new InternalServerErrorException({
        message: 'Error enviando el correo.',
        error: (result as any).error?.message || result,
      });
    }

    return {
      success: 1,
      message: 'Correo enviado exitosamente.',
      sesMessageId: (result as any).MessageId || (result as any).$metadata?.requestId,
    };
  }

  async getMe(req: Request): Promise<UserModel> {
    const user = (await this.legacyAuthService.getAuthorizedUser(req)) as UserModel;
    const settings = await this.getSettings(user);

    return this.serializeUser(user, {
      settings,
    });
  }

  async getByEmail(req: Request, email: string): Promise<UserModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    this.legacyAuthService.assertSameUserOrAdmin(
      requester,
      email,
      'Not authorized.',
    );

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`Unable to find user. User email: ${email}`);
    }

    return this.serializeUser(user);
  }

  async getById(req: Request, id: string): Promise<UserModel> {
    await this.legacyAuthService.getAuthorizedUser(req);

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`Unable to find user. User Id: ${id}`);
    }

    const settings = await this.getSettings(user as UserModel);
    return this.serializeUser(user, {
      settings,
    });
  }

  async updateUser(
    req: Request,
    id: string,
    payload: UpdateUserDto,
  ): Promise<UserModel> {
    try {
      const requester = await this.legacyAuthService.getAuthorizedUser(req);
      const user = await this.userRepository.findByIdWithoutSettings(id);

      if (!user) {
        throw new NotFoundException(`Unable to find user. User Id: ${id}`);
      }

      this.legacyAuthService.assertSameUserOrAdmin(
        requester,
        user.email,
        'Not authorized.',
      );

      const requestIp = req.ip || '';

      for (const [key, value] of Object.entries(payload)) {
        if (!UPDATEABLE_FIELDS.includes(key as (typeof UPDATEABLE_FIELDS)[number])) {
          continue;
        }

        if (key === 'location') {
          if ((user.location && user.location.country) || isLocalIp(requestIp)) {
            continue;
          }

          try {
            user[key] = await findIpLocation(requestIp);
          } catch {
            continue;
          }

          continue;
        }

        user[key] = value;
      }

      const savedUser = await this.userRepository.save(user);

      if (!savedUser) {
        throw new NotFoundException(`Unable to find user. User id: ${id}`);
      }

      return savedUser.toJSON() as UserModel;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Error updating user. ',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async listUser(
    req: Request,
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponse> {
    await this.legacyAuthService.getAuthorizedUser(req);

    const nextQuery = this.buildUserSearchQuery(query);

    return this.userRepository.paginatedList(nextQuery, query, true);
  }

  async removeUser(req: Request, id: string): Promise<UserModel> {
    const requester = await this.getAdminUser(req);
    void requester;

    const user = await this.userRepository.removeById(id);

    if (!user) {
      throw new NotFoundException({
        message: `User not found. User Id: ${id}`,
      });
    }

    return typeof user.toJSON === 'function'
      ? (user.toJSON() as UserModel)
      : (user as UserModel);
  }

  async listUsersBackoffice(
    req: Request,
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponse> {
    await this.getAdminUser(req);

    const nextQuery = this.buildUserSearchQuery(query);

    return this.userRepository.paginatedList(nextQuery, query);
  }

  async createUserBackoffice(
    req: Request,
    payload: CreateUserBackofficeDto,
  ): Promise<UserModel> {
    await this.getAdminUser(req);

    const isEmailConfirmed = payload.emailConfirmed === true;
    const providedEmail = payload.email?.trim();

    if (!providedEmail && !isEmailConfirmed) {
      throw new BadRequestException({
        message: 'Email is required unless it is confirmed manually.',
      });
    }

    const trimmedPassword = payload.password?.trim();

    if (isEmailConfirmed) {
      if (!trimmedPassword) {
        throw new BadRequestException({
          message: 'Password is required when email is confirmed manually.',
        });
      }

      if (trimmedPassword.length < 6) {
        throw new BadRequestException({
          message:
            'Password must be at least 6 characters when email is confirmed manually.',
        });
      }
    }

    try {
      const email =
        providedEmail || (await this.generateInternalBackofficeEmail());
      const existingUser =
        await this.userRepository.findByEmailWithoutPopulate(email);

      if (existingUser) {
        throw new ConflictException({
          message: 'User already exists with that email.',
        });
      }

      const confirmationToken = this.generateVerificationUrl();
      const provisionalPassword =
        isEmailConfirmed
          ? trimmedPassword!
          : payload.password || randomBytes(16).toString('hex');

      const user = this.userRepository.createUser({
        ...payload,
        email,
        isFirstLogin: true,
        isByBackOffice: true,
        passwordLastChanged: new Date(),
        emailConfirmed: isEmailConfirmed,
        emailConfirmToken: isEmailConfirmed ? undefined : confirmationToken,
        emailConfirmExpires: isEmailConfirmed
          ? undefined
          : new Date(Date.now() + 86400 * 1000),
      });

      user.password = await bcrypt.hash(provisionalPassword, 10);

      const savedUser = await this.userRepository.save(user);

      const newSettings = this.userRepository.createSettings({
        user: savedUser._id,
        navigation: {
          active: false,
          shareShowActive: false,
          bigScrollButtonsActive: false,
          navigationButtonsStyle: 'sides',
          caBackButtonActive: false,
          quickUnlockActive: false,
          removeOutputActive: false,
          vocalizeFolders: true,
          liveMode: false,
        },
      });

      await newSettings.save();

      if (!isEmailConfirmed) {
        await this.sendBackofficeVerificationEmail(
          savedUser.email,
          confirmationToken,
          String(savedUser._id || savedUser.id),
          savedUser.locale || 'en-US',
        );
      }

      return savedUser.toJSON() as UserModel;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Error creando usuario',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateUserBackoffice(
    req: Request,
    id: string,
    payload: UpdateUserBackofficeDto,
  ): Promise<UserModel> {
    await this.getAdminUser(req);

    const targetId = id || payload.id;

    if (!targetId) {
      throw new BadRequestException({ message: 'User ID is required.' });
    }

    try {
      const {
        id: _id,
        password,
        ...rawUpdateData
      } = payload;
      const updateData: Record<string, unknown> = { ...rawUpdateData };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
        updateData.passwordLastChanged = new Date();
      }

      const updatedUser = await this.userRepository.updateById(targetId, updateData);

      if (!updatedUser) {
        throw new NotFoundException({
          message: `User not found. User Id: ${targetId}`,
        });
      }

      return updatedUser.toJSON() as UserModel;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Error updating user.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async confirmEmailBackoffice(
    id: string,
    token: string,
  ): Promise<UserActionResponse & { token?: string; email?: string }> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        message: `User not found. User Id: ${id}`,
      });
    }

    if (user.emailConfirmed) {
      return {
        success: 1,
        userid: String(user._id || user.id),
        email: user.email,
        message: 'Email already confirmed.',
      };
    }

    if (!user.emailConfirmToken || user.emailConfirmToken !== token) {
      throw new BadRequestException({
        message: 'Invalid confirmation token.',
      });
    }

    if (user.emailConfirmExpires && user.emailConfirmExpires < new Date()) {
      throw new BadRequestException({
        message: 'Confirmation link expired.',
      });
    }

    return {
      success: 1,
      userid: String(user._id || user.id),
      token: token,
      email: user.email,
      message: 'Token verified! Proceed to set password.',
    };
  }

  async setupPasswordBackoffice(
    id: string,
    payload: { token: string; password: string },
  ): Promise<UserActionResponse> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException({ message: 'User not found.' });
    }

    if (user.emailConfirmed) {
      throw new BadRequestException({ message: 'Email already confirmed.' });
    }

    if (!user.emailConfirmToken || user.emailConfirmToken !== payload.token) {
      throw new BadRequestException({ message: 'Invalid or expired confirmation token.' });
    }

    if (user.emailConfirmExpires && user.emailConfirmExpires < new Date()) {
      throw new BadRequestException({ message: 'Confirmation link expired.' });
    }

    const hash = await this.hashPassword(payload.password);
    
    user.password = hash;
    user.passwordLastChanged = new Date();
    user.emailConfirmed = true;
    user.emailConfirmToken = undefined;
    user.emailConfirmExpires = undefined;

    await this.userRepository.save(user);

    return {
      success: 1,
      userid: String(user._id || user.id),
      message: 'Password set successfully.',
    };
  }

  async resendConfirmEmailBackoffice(
    req: Request,
    id: string,
  ): Promise<UserActionResponse> {
    await this.getAdminUser(req);

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException({
        message: `User not found. User Id: ${id}`,
      });
    }

    if (user.emailConfirmed) {
      return {
        success: 1,
        userid: String(user._id || user.id),
        message: 'Email already confirmed.',
      };
    }

    const confirmationToken = this.generateVerificationUrl();
    user.emailConfirmToken = confirmationToken;
    user.emailConfirmExpires = new Date(Date.now() + 86400 * 1000);
    await this.userRepository.save(user);

    await this.sendBackofficeVerificationEmail(
      user.email,
      confirmationToken,
      String(user._id || user.id),
      user.locale || 'en-US',
    );

    return {
      success: 1,
      userid: String(user._id || user.id),
      message: 'Verification email resent successfully.',
    };
  }

  async removeUserBackoffice(
    req: Request,
    id: string,
  ): Promise<RemoveUserBackofficeResponse> {
    await this.getAdminUser(req);

    if (!id) {
      throw new BadRequestException({ message: 'User ID is required.' });
    }

    const user = await this.userRepository.findByIdWithoutSettings(id);

    if (!user) {
      throw new NotFoundException({
        message: `User not found. User Id: ${id}`,
      });
    }

    try {
      await this.userRepository.removeCommunicatorsByEmail(user.email);
      await this.userRepository.removeBoardsByEmail(user.email);
      await this.userRepository.removeSettingsByUserId(String(user._id || user.id));

      const removedUser = await this.userRepository.removeById(id);

      return {
        user: removedUser ? (removedUser.toJSON() as UserModel) : null,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Error deleting user or related data.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }



  async resendTherapistConfirmEmail(req: Request, userId: string): Promise<UserActionResponse> {
    await this.getAdminUser(req);

    const user = await this.userRepository.findByIdWithoutSettings(userId);
    if (!user) throw new NotFoundException(`User not found: ${userId}`);

    if (user.emailConfirmed) {
      return { success: 1, message: 'El email ya fue confirmado.' };
    }

    const token = randomBytes(32).toString('hex');
    await this.userRepository.updateById(userId, { emailConfirmToken: token });

    const mailText = this.mailTemplateService.getTherapistWelcomeMail(
      user.name,
      process.env.BACKOFFICE_URL as string,
      token,
      String(user._id || user.id),
      user.email,
    );

    await this.mailGateway.sendEmail(user.email, mailText.subject, mailText.html);

    return { success: 1, message: 'Email de confirmación reenviado.' };
  }

  async checkUserEmailBackoffice(
    req: Request,
    email: string,
  ): Promise<EmailAvailabilityResponse> {
    await this.getAdminUser(req);

    const user = await this.userRepository.findByEmailWithoutPopulate(email);

    return {
      available: !user,
    };
  }

  private async getSettings(user: UserModel): Promise<Record<string, unknown> | null> {
    let settings = null;

    try {
      settings = await this.userRepository.getOrCreateSettings(user);
    } catch {}

    return settings ? sanitizePublicSettingsModel(settings) : null;
  }

  private serializeUser(
    user: any,
    overrides: Partial<UserModel> = {},
  ): UserModel {
    const baseUser =
      typeof user?.toJSON === 'function' ? user.toJSON() : { ...(user || {}) };
    const nextUser = {
      ...baseUser,
      ...overrides,
    } as UserModel;

    if (nextUser.settings) {
      nextUser.settings = sanitizePublicSettingsModel(nextUser.settings);
    }

    return nextUser;
  }

  private async reviewSubscriber(userId: string, isByBackOffice = false): Promise<Record<string, unknown>> {
    let subscriber = await this.subscriberRepository.findByUserId(userId);

    if (!subscriber) {
      let expirationDate: Date | undefined;
      if (!isByBackOffice) {
        const { trialDays } = await this.appConfigService.getConfig();
        if (trialDays > 0) {
          expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + trialDays);
        }
      }
      subscriber = this.subscriberRepository.create({
        userId,
        status: isByBackOffice ? 'active' : 'not_subscribed',
        ...(expirationDate ? { expirationDate } : {}),
      });
      await this.subscriberRepository.save(subscriber);
    } else if (!isByBackOffice && !subscriber.expirationDate) {
      // Subscriber existente sin expirationDate: asignar trial retroactivamente
      const { trialDays } = await this.appConfigService.getConfig();
      if (trialDays > 0) {
        const base = subscriber.createdAt ? new Date(subscriber.createdAt) : new Date();
        const expirationDate = new Date(base);
        expirationDate.setDate(expirationDate.getDate() + trialDays);
        subscriber.expirationDate = expirationDate;
        await this.subscriberRepository.save(subscriber);
      }
    }

    // Si fue cancelado explícitamente, respetar ese estado.
    if ((subscriber as any).cancelledAt) {
      return typeof subscriber.toJSON === 'function'
        ? (subscriber.toJSON() as Record<string, unknown>)
        : (subscriber as Record<string, unknown>);
    }

    if (subscriber.expirationDate) {
      const now = new Date();
      const endDate = new Date(subscriber.expirationDate);
      const currentStatus = String(subscriber.status || 'not_subscribed').toLowerCase();
      let nextStatus = currentStatus;

      if (isByBackOffice) {
        nextStatus = endDate > now ? 'active' : 'not_subscribed';
      } else {
        const activeSubscriptions =
          await this.billingPersistenceService.findActiveSubscriptionsByUserId(userId);
        const hasActivePaidSubscription = activeSubscriptions.length > 0;

        if (!hasActivePaidSubscription) {
          // Trial u otros estados sin suscripción paga activa.
          nextStatus = 'not_subscribed';
        } else if (endDate <= now) {
          nextStatus = 'not_subscribed';
        } else if (currentStatus === 'not_subscribed') {
          nextStatus = 'active';
        }
      }

      if (nextStatus !== currentStatus) {
        subscriber.status = nextStatus;
        await this.subscriberRepository.save(subscriber);
      }
    }

    return typeof subscriber.toJSON === 'function'
      ? (subscriber.toJSON() as Record<string, unknown>)
      : (subscriber as Record<string, unknown>);
  }

  private async updateUserLocation(ip: string, user: any): Promise<void> {
    if ((!user.location || !user.location.country) && !isLocalIp(ip)) {
      try {
        const newLocation = await findIpLocation(ip);

        if (newLocation && newLocation.country) {
          user.location = newLocation;
          await this.userRepository.save(user);
        }
      } catch {}
    }
  }

  private generateVerificationUrl(): string {
    return randomBytes(24).toString('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(password, salt);
  }

  private async sendVerificationEmail(
    email: string,
    verificationUrl: string,
  ): Promise<void> {
    const mailText = this.mailTemplateService.getVerificationMail(
      'en-US',
      process.env.KOMUNICARE_URL as string,
      verificationUrl,
    );
    const result = await this.mailGateway.sendEmail(
      email,
      mailText.subject,
      mailText.html,
    );

    if ((result as any)?.error) {
      throw new InternalServerErrorException({
        message: 'ERROR: sending verification email FAILED ',
      });
    }
  }

  private async sendBackofficeVerificationEmail(
    email: string,
    verificationToken: string,
    userId: string,
    locale: string,
  ): Promise<void> {
    const domain = process.env.BACKOFFICE_URL as string | undefined;
    if (!domain) {
      throw new InternalServerErrorException({
        message: 'Backoffice URL is not configured.',
      });
    }

    const mailText = this.mailTemplateService.getBackofficeVerificationMail(
      locale,
      domain,
      userId,
      verificationToken,
      email,
    );
    const result = await this.mailGateway.sendEmail(
      email,
      mailText.subject,
      mailText.html,
    );

    if ((result as any)?.error) {
      throw new InternalServerErrorException({
        message: 'ERROR: sending backoffice verification email FAILED ',
      });
    }
  }

  private async generateInternalBackofficeEmail(): Promise<string> {
    let email = '';

    do {
      email = `backoffice-user-${Date.now()}-${randomBytes(6).toString('hex')}@komunicare.invalid`;
    } while (await this.userRepository.findByEmailWithoutPopulate(email));

    return email;
  }

  private buildUserSearchQuery(query: ListUsersQueryDto): Record<string, unknown> {
    const { search = '', name = '', role, isByBackOffice } = query;
    const searchFields = ['name', 'email'];
    const filters: Record<string, unknown> = {};

    if (role) filters.role = role;
    if (isByBackOffice === 'true') filters.isByBackOffice = true;
    if (isByBackOffice === 'false') filters.isByBackOffice = { $ne: true };

    if (search) {
      return { ...filters, ...(getORQuery(searchFields, search, true) as Record<string, unknown>) };
    }

    if (name) {
      return { ...filters, ...(getQuery('name', name, true) as Record<string, unknown>) };
    }

    return filters;
  }

  async blockUserBackoffice(req: Request, userId: string): Promise<UserActionResponse> {
    await this.getAdminUser(req);

    const user = await this.userRepository.findByIdWithoutSettings(userId);
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    await this.userRepository.blockById(userId);

    return { message: 'User blocked successfully.' };
  }

  async unblockUserBackoffice(req: Request, userId: string): Promise<UserActionResponse> {
    await this.getAdminUser(req);

    const user = await this.userRepository.findByIdWithoutSettings(userId);
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    await this.userRepository.unblockById(userId);

    return { message: 'User unblocked successfully.' };
  }

  private async getAdminUser(req: Request): Promise<UserModel> {
    const requester = (await this.legacyAuthService.getAuthorizedUser(
      req,
    )) as UserModel;

    if (!requester.isAdmin && requester.role !== 'admin') {
      throw new ForbiddenException('Not authorized.');
    }

    return requester;
  }
}
