# Komunicare API

> This project was originally based on [cboard-org/cboard-api](https://github.com/cboard-org/cboard-api) and has been modified by [SilvernetSA](https://github.com/SilvernetSA) / Komunicare.
>
> The source code is provided under the GNU GPLv3 in compliance with the original license.

Backend API for the Komunicare AAC platform. This service powers the public communication experience, therapist and admin workflows, subscriptions, media handling, AI-assisted features, and shared data used across the Komunicare ecosystem.

## Platform relationship

- Frontend: the public AAC web experience consumes authentication, boards, communicators, media, subscriptions, and other end-user endpoints exposed here.
- Backoffice: admin and therapist operations also rely on this API for users, plans, products, settings, and operational content, but the backoffice application is not part of this public repository.
- Keyboard app: keyboard-related settings and user-linked data are served by the same backend domain model, but the keyboard application is not part of this public repository.

## Prerequisites

- Node.js LTS
- npm
- MongoDB reachable from your local environment
- Docker Desktop or Docker Engine if you want the containerized local stack

## Local configuration

No real environment files are committed to this repository.

- For Docker-based local runs, create a local `.env.local` file. `docker-compose.local.yml` loads it automatically.
- For direct `npm run dev`, export the same variables in your shell or create a local `.env` file. The app boots through `dotenv-defaults/config`, so standard dotenv loading applies.

### Minimum local variables

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `DATABASE_URL_DEV` or `MONGO_URL` | Yes | MongoDB connection string | `mongodb://localhost:27017/komunicare` |
| `API_SESSION_SECRET` | Recommended | Express session secret | `change-me-session-secret` |
| `JWT_SECRET` | Recommended | JWT signing secret | `change-me-jwt-secret` |
| `JWT_ISSUER` | Recommended | JWT issuer value | `komuni.care` |
| `KOMUNICARE_URL` | Recommended | Public frontend base URL used in links, emails, and payment redirects | `http://localhost:3001` |
| `BACKOFFICE_URL` | Recommended | Backoffice base URL used in admin-created account flows | `http://localhost:3001` |
| `PORT` | Optional | HTTP port for the API | `10010` |

### Feature-specific variables

Only set these when you need the related integrations locally:

- Mail delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`, `SES_USERNAME`, `SES_PASSWORD`
- Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_SECRET_KEY`, `MERCADOPAGO_BACK_URL`, `MERCADOPAGO_TEST_MODE`
- PayPal: `PAYPAL_API_URL`, `PAYPAL_API_CLIENT_ID`, `PAYPAL_API_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- Storage: `AZURE_STORAGE_CONNECTION_STRING`, `BLOB_MEDIA_CONTAINER`, `BLOB_CONTAINER_NAME`
- AI services: `OPEN_AI_API_KEY`, `AI_ENGINE_LAMBDA_URL`, `AI_ENGINE_LAMBDA_API_KEY`
- Other integrations: `IP_INFO_TOKEN`, `KOMUNICARE_SUPPORT_EMAIL`, `NEST_PORT`, `DEV_ENV_WITH_HTTPS`

## Run locally

### Direct Node.js workflow

```bash
npm install
npm run dev
```

Default local URLs:

- API: `http://localhost:10010`
- OpenAPI / Swagger UI: `http://localhost:10010/docs`

### Docker workflow

```bash
npm install
npm run build-docker
npm run run-docker
```

Default local URLs:

- API: `http://localhost:10010`
- OpenAPI / Swagger UI: `http://localhost:10010/docs`
- MailHog UI: `http://localhost:8026`

For local email verification and password reset flows, see `MAILHOG_LOCAL.md`.

To stop the Docker stack:

```bash
npm run stop-docker
```

## Build and test

```bash
npm run build
npm test
```

## GitHub Actions deployment configuration

Public deploy workflows do not include preconfigured deployment hosts, Docker image coordinates, or the dev environment URL.

- Set the repository variable `DOCKER_IMAGE_NAME` to the full image name you want to publish and deploy, for example `your-dockerhub-user/komunicare-api`.
- Keep `DOCKER_USERNAME` and `DOCKER_PASSWORD` configured as GitHub Actions secrets for the Docker Hub login step.
- Set `DEPLOY_HOST_DEV` and `DEPLOY_HOST_PROD` as GitHub Actions secrets with the SSH host or IP for each environment.
- Set `KOMUNICARE_URL_DEV` as a GitHub Actions secret with the frontend base URL used by the public dev deployment.
- All other runtime secrets referenced by the workflows, such as database credentials, app secrets, payment provider credentials, and AI integration keys, must also be configured in repository secrets before deployment.

Useful additional commands:

```bash
npm run dev-https
npm run run-docker-https
npm run start-build
```

## API documentation

The API exposes Swagger/OpenAPI documentation at `http://localhost:10010/docs` when the server is running.

## License

Licensed under `GPL-3.0-only`. See `LICENSE` for details.
