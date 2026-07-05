import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMailGatewayConfig } from '../../src/nest/common/mail-gateway.service';

const ORIGINAL_ENV = { ...process.env };

const restoreEnv = (): void => {
  process.env = { ...ORIGINAL_ENV };
};

test('buildMailGatewayConfig uses SMTP env config for local MailHog without auth', () => {
  restoreEnv();

  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = '1025';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_FROM = 'dev@komuni.care';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  const config = buildMailGatewayConfig(process.env);

  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 1025);
  assert.equal(config.secure, false);
  assert.equal(config.auth, undefined);
  assert.equal(config.from, 'dev@komuni.care');

  restoreEnv();
});

test('buildMailGatewayConfig falls back to SES config when SMTP envs are not present', () => {
  restoreEnv();

  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  process.env.SES_USERNAME = 'ses-user';
  process.env.SES_PASSWORD = 'ses-pass';

  const config = buildMailGatewayConfig(process.env);

  assert.equal(config.host, 'email-smtp.us-east-1.amazonaws.com');
  assert.equal(config.port, 465);
  assert.equal(config.secure, true);
  assert.equal(config.auth?.user, 'ses-user');
  assert.equal(config.auth?.pass, 'ses-pass');

  restoreEnv();
});
