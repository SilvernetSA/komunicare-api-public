import test from 'node:test';
import assert from 'node:assert/strict';

import { UserController } from '../../src/nest/modules/user/user.controller';

test('UserController.createUser delegates payload to UserService', async () => {
  let receivedPayload: unknown;

  const userService = {
    async createUser(payload: unknown) {
      receivedPayload = payload;
      return {
        success: 1,
        message: 'An email has been sent to you. Please check it to verify your account.',
      };
    },
  };

  const controller = new UserController(userService as any);

  const payload = {
    name: 'Damian',
    email: 'damian@example.com',
    password: 'secret123',
  };

  const response = await controller.createUser(payload as any);

  assert.deepEqual(receivedPayload, payload);
  assert.equal(response.success, 1);
});


test('UserController.forgotPassword delegates request to UserService', async () => {
  let receivedPayload: unknown;

  const userService = {
    async forgotPassword(payload: unknown) {
      receivedPayload = payload;
      return {
        response: true,
        message: 'Password reset requested.',
      };
    },
  };

  const controller = new UserController(userService as any);

  const response = await controller.forgotPassword({
    email: 'damian@example.com',
  } as any);

  assert.deepEqual(receivedPayload, { email: 'damian@example.com' });
  assert.equal(response.response, true);
});
