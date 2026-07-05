import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const DEFAULT_EMAIL_SOURCE = 'info@komuni.care';
const DEFAULT_SES_HOST = 'email-smtp.us-east-1.amazonaws.com';
const DEFAULT_SES_PORT = 465;
const DEFAULT_SES_USERNAME = process.env.SES_USERNAME || '';

type GatewayAuth = {
  user: string;
  pass: string;
};

export type MailGatewayConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: GatewayAuth;
  from: string;
};

const isValidEmail = (email: string): boolean => {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const resolveAuth = (env: NodeJS.ProcessEnv): GatewayAuth | undefined => {
  const hasCustomSmtp =
    Boolean(env.SMTP_HOST) ||
    Boolean(env.SMTP_PORT) ||
    Boolean(env.SMTP_SECURE) ||
    Boolean(env.SMTP_USER) ||
    Boolean(env.SMTP_PASS);

  if (hasCustomSmtp) {
    if (!env.SMTP_USER && !env.SMTP_PASS) {
      return undefined;
    }

    return {
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
    };
  }

  return {
    user: env.SES_USERNAME || DEFAULT_SES_USERNAME,
    pass: env.SES_PASSWORD || '',
  };
};

export const buildMailGatewayConfig = (env: NodeJS.ProcessEnv): MailGatewayConfig => {
  const host = env.SMTP_HOST || DEFAULT_SES_HOST;
  const port = parseNumber(env.SMTP_PORT, DEFAULT_SES_PORT);
  const secure = parseBoolean(env.SMTP_SECURE, port === DEFAULT_SES_PORT);

  return {
    host,
    port,
    secure,
    auth: resolveAuth(env),
    from: env.SMTP_FROM || env.MAIL_FROM || DEFAULT_EMAIL_SOURCE,
  };
};

@Injectable()
export class MailGatewayService {
  private transporter: nodemailer.Transporter;
  private readonly emailSource: string;

  constructor() {
    const mailConfig = buildMailGatewayConfig(process.env);

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.auth,
    });

    this.emailSource = mailConfig.from;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<any> {
    if (!to) {
      return { error: new Error('Falta la dirección de destino (to).') };
    }

    const cleanTo = to.trim();
    if (!isValidEmail(cleanTo)) {
      return { error: new Error(`Dirección de destino inválida: ${cleanTo}`) };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.emailSource,
        to: cleanTo,
        subject: subject,
        html: html,
      });
      return info;
    } catch (error) {
      return { error };
    }
  }
}
