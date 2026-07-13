import 'reflect-metadata';
import cors from 'cors';
import express, { Application } from 'express';
import http, { Server as HttpServer } from 'http';
import https, { Server as HttpsServer } from 'https';
import pem from 'pem';
import bodyParser from 'body-parser';
import session from 'express-session';
import morgan from 'morgan';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { NestAppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require('../db');
// connect-mongo ES import lacks types, keep require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MongoStore = require('connect-mongo')(session);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../config');

type BootstrapOptions = {
  port?: number;
};

const corsOptions: cors.CorsOptions = {
  origin: function(origin, callback) {
    if (
      !origin ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('komuni.care') ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const mountCompatibilityRoutes = (expressApp: Application): void => {
  expressApp.use((req, _res, next) => {
    if (req.url === '/nest' || req.url.startsWith('/nest/')) {
      req.url = req.url.slice('/nest'.length) || '/';
    }

    next();
  });
};

const applySwaggerBasicAuth = (expressApp: Application): void => {
  const swaggerPassword = process.env.SWAGGER_PASSWORD;
  if (!swaggerPassword) return;

  expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith('/docs')) return next();

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      const colonIdx = credentials.indexOf(':');
      const pass = colonIdx >= 0 ? credentials.slice(colonIdx + 1) : credentials;
      if (pass === swaggerPassword) {
        return next();
      }
    }

    res.set('WWW-Authenticate', 'Basic realm="Komunicare API Docs"');
    res.status(401).send('Unauthorized');
  });
};

const applyExpressMiddleware = (expressApp: Application): void => {
  expressApp.use(cors(corsOptions));
  expressApp.enable('trust proxy');
  applySwaggerBasicAuth(expressApp);
  mountCompatibilityRoutes(expressApp);

  expressApp.get('/', (_req, res) => {
    res.send('Server is ready!');
  });

  expressApp.use(morgan('dev'));
  expressApp.use(bodyParser.json({ limit: '10mb' }));
  expressApp.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
  expressApp.use(
    session({
      secret: [config.getConfig().session.secret, 'work hard'],
      name: 'sessionId',
      resave: true,
      saveUninitialized: false,
      store: new MongoStore({
        mongooseConnection: db.conn,
        // Avoid startup crash when a legacy sessions.expires index exists
        // with conflicting options (IndexOptionsConflict code 85).
        autoRemove: 'disabled',
      }),
    }),
  );
};

const attachFallbackErrorHandler = (expressApp: Application): void => {
  expressApp.use(
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[API ERROR]', err);

      const status = err.statusCode || 500;
      res.status(status).json({
        error: err.message || 'Internal Server Error',
      });
    },
  );
};

const createServer = async (
  expressApp: Application,
): Promise<HttpServer | HttpsServer> => {
  const httpsEnabled = process.env.DEV_ENV_WITH_HTTPS
    ? parseInt(process.env.DEV_ENV_WITH_HTTPS, 10)
    : 0;

  if (!httpsEnabled) {
    return http.createServer(expressApp);
  }

  Logger.log('*** Dev Server = HTTPS Enabled ***');

  try {
    return await new Promise<HttpsServer>((resolve, reject) => {
      pem.createCertificate({ days: 365, selfSigned: true }, function(err: Error, keys: any) {
        if (err) {
          return reject(err);
        }

        resolve(
          https.createServer(
            { key: keys.serviceKey, cert: keys.certificate },
            expressApp,
          ),
        );
      });
    });
  } catch (error) {
    Logger.error('Could not create HTTPS Server', error);
    return http.createServer(expressApp);
  }
};

export const bootstrapNestApplication = async (
  options: BootstrapOptions = {},
): Promise<INestApplication> => {
  const expressApp = express();
  applyExpressMiddleware(expressApp);

  const nestApp = await NestFactory.create(
    NestAppModule,
    new ExpressAdapter(expressApp),
    {
      bodyParser: false,
      logger: ['error', 'warn', 'log'],
    },
  );

  nestApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Komunicare API')
    .setDescription(
      'NestJS-powered backend for Komunicare, including boards, communicators, users, subscriptions, media and supporting resources.',
    )
    .setVersion('1.3.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT bearer token',
      },
      'Bearer',
    )
    .build();

  const openApiDocument = SwaggerModule.createDocument(nestApp, swaggerConfig, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('docs', nestApp, openApiDocument, {
    customSiteTitle: 'Komunicare API Docs',
    jsonDocumentUrl: 'docs/openapi.json',
  });

  await nestApp.init();
  attachFallbackErrorHandler(expressApp);

  const server = await createServer(expressApp);

  const port = options.port ?? Number(process.env.PORT || 10010);
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      Logger.log(`Started server on port ${port}`);
      resolve();
    });
  });

  Logger.log(
    'Nest application mounted directly on root paths. Legacy /nest/* URLs are rewritten for compatibility.',
  );

  return nestApp;
};
