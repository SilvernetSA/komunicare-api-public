import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

import { UserService } from '../../src/nest/modules/user/user.service';

test('UserService.createUser creates a temporary user and sends verification email', async () => {
  let temporaryUserSaved = false;
  let verificationMailArgs: unknown[] = [];
  let mailSentTo = '';

  const userRepository = {
    async findByEmail() {
      return null;
    },
    async findTemporaryUserByEmail() {
      return null;
    },
    createTemporaryUser(payload: Record<string, unknown>) {
      return {
        ...payload,
        async save() {
          temporaryUserSaved = true;
        },
      };
    },
  };

  const mailTemplateService = {
    getVerificationMail(...args: unknown[]) {
      verificationMailArgs = args;
      return {
        subject: 'Verify account',
        html: '<p>verify</p>',
      };
    },
  };

  const mailGateway = {
    async sendEmail(to: string) {
      mailSentTo = to;
      return { MessageId: 'ses-message-id' };
    },
  };

  const service = new UserService(
    {} as any,
    mailGateway as any,
    mailTemplateService as any,
    {} as any,
    userRepository as any,
  );

  const result = await service.createUser({
    name: 'Damian',
    email: 'damian@example.com',
    password: 'secret123',
  });

  assert.equal(result.success, 1);
  assert.equal(temporaryUserSaved, true);
  assert.equal(mailSentTo, 'damian@example.com');
  assert.equal(verificationMailArgs[0], 'en-US');
  assert.match(String(result.message || ''), /email has been sent/i);
});

test('UserService.createUser throws conflict when user already exists', async () => {
  const userRepository = {
    async findByEmail() {
      return { id: 'user-1' };
    },
  };

  const service = new UserService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    userRepository as any,
  );

  await assert.rejects(
    service.createUser({
      name: 'Damian',
      email: 'damian@example.com',
      password: 'secret123',
    }),
    (error: any) => {
      assert.equal(error.getStatus(), 409);
      assert.match(
        String(error.getResponse()?.message || ''),
        /already signed up/i,
      );
      return true;
    },
  );
});

test('UserService.forgotPassword creates a reset token and sends email', async () => {
  let resetPasswordPayload: Record<string, unknown> | null = null;
  let resetSaved = false;
  let sentEmailArgs: unknown[] = [];

  const userRepository = {
    async findByEmail(email: string) {
      assert.equal(email, 'damian@example.com');
      return {
        id: 'user-1',
        _id: 'user-1',
        email: 'damian@example.com',
        locale: 'es-ES',
      };
    },
    async findResetPasswordByUserId() {
      return null;
    },
    createResetPassword(payload: Record<string, unknown>) {
      resetPasswordPayload = payload;
      return {
        ...payload,
        async save() {
          resetSaved = true;
        },
      };
    },
  };

  const mailTemplateService = {
    getResetPasswordMail(locale: string, domain: string, token: string, userId: string) {
      assert.equal(locale, 'es-ES');
      assert.equal(domain, process.env.KOMUNICARE_URL);
      assert.equal(userId, 'user-1');
      assert.ok(token.length > 10);
      return {
        subject: 'Reset password',
        html: '<p>reset</p>',
      };
    },
  };

  const mailGateway = {
    async sendEmail(...args: unknown[]) {
      sentEmailArgs = args;
      return { MessageId: 'ses-reset' };
    },
  };

  const service = new UserService(
    {} as any,
    mailGateway as any,
    mailTemplateService as any,
    {} as any,
    userRepository as any,
  );

  const result = await service.forgotPassword({ email: 'damian@example.com' });

  assert.equal(result.response, true);
  assert.equal(resetSaved, true);
  assert.equal(sentEmailArgs[0], 'damian@example.com');
  assert.equal(sentEmailArgs[1], 'Reset password');
  assert.ok(resetPasswordPayload);
  assert.equal(resetPasswordPayload?.status, false);
  assert.equal(typeof resetPasswordPayload?.resetPasswordToken, 'string');
  const expiresAt = resetPasswordPayload?.resetPasswordExpires as Date;
  assert.ok(expiresAt instanceof Date);
  assert.ok(expiresAt.getTime() > Date.now());
});

test('UserService.storePassword updates password when reset token matches', async () => {
  const rawToken = 'reset-token-123';
  const hashedToken = await bcrypt.hash(rawToken, 8);

  let updateByIdArgs: unknown[] = [];
  let markedResetPasswordId = '';

  const userRepository = {
    async findPendingResetPasswordByUserId(userId: string) {
      assert.equal(userId, 'user-1');
      return {
        id: 'reset-1',
        _id: 'reset-1',
        resetPasswordToken: hashedToken,
      };
    },
    async updateById(id: string, payload: Record<string, unknown>) {
      updateByIdArgs = [id, payload];
      return { id: 'user-1' };
    },
    async markResetPasswordAsUsed(id: string) {
      markedResetPasswordId = id;
      return { ok: 1 };
    },
  };

  const service = new UserService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    userRepository as any,
  );

  const result = await service.storePassword({
    userid: 'user-1',
    password: 'new-password-123',
    url: rawToken,
  });

  assert.equal(result.success, 1);
  assert.equal(markedResetPasswordId, 'reset-1');
  assert.equal(updateByIdArgs[0], 'user-1');
  assert.equal(typeof (updateByIdArgs[1] as any).password, 'string');
  assert.notEqual((updateByIdArgs[1] as any).password, 'new-password-123');
});

test('UserService.reviewSubscriber demotes trial-like active status without paid subscriptions', async () => {
  const subscriber: any = {
    userId: 'user-1',
    status: 'active',
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    toJSON() {
      return {
        userId: this.userId,
        status: this.status,
        expirationDate: this.expirationDate,
      };
    },
  };

  let saveCalls = 0;
  const service = new UserService(
    {} as any,
    {} as any,
    {} as any,
    {
      async findByUserId() {
        return subscriber;
      },
      async save(doc: any) {
        saveCalls += 1;
        return doc;
      },
      create() {
        throw new Error('create should not be called');
      },
    } as any,
    {} as any,
    {
      async getConfig() {
        return { trialDays: 15 };
      },
    } as any,
    {
      async findActiveSubscriptionsByUserId(userId: string) {
        assert.equal(userId, 'user-1');
        return [];
      },
    } as any,
  );

  const result = await (service as any).reviewSubscriber('user-1', false);

  assert.equal(result.status, 'not_subscribed');
  assert.equal(saveCalls, 1);
});

test('UserService.reviewSubscriber keeps new trial records as not_subscribed', async () => {
  let saveCalls = 0;
  let createdSubscriber: any = null;

  const service = new UserService(
    {} as any,
    {} as any,
    {} as any,
    {
      async findByUserId() {
        return null;
      },
      create(payload: Record<string, unknown>) {
        createdSubscriber = {
          ...payload,
          toJSON() {
            return this;
          },
        };
        return createdSubscriber;
      },
      async save(doc: any) {
        saveCalls += 1;
        return doc;
      },
    } as any,
    {} as any,
    {
      async getConfig() {
        return { trialDays: 10 };
      },
    } as any,
    {
      async findActiveSubscriptionsByUserId(userId: string) {
        assert.equal(userId, 'user-1');
        return [];
      },
    } as any,
  );

  const result = await (service as any).reviewSubscriber('user-1', false);

  assert.ok(createdSubscriber);
  assert.equal(result.status, 'not_subscribed');
  assert.ok(result.expirationDate);
  assert.equal(saveCalls >= 1, true);
});
