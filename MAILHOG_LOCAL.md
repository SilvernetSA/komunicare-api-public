# MailHog local (registro + recuperación de contraseña)

## Levantar todo con Docker (API + MailHog)

Desde `komunicare-API`:

```bash
npm run build-docker
npm run run-docker
```

Servicios:

- API: `http://localhost:10010`
- MailHog UI: `http://localhost:8026`

`run-docker` usa `docker-compose.local.yml` y ya inyecta SMTP local para que los correos de registro y recuperación no salgan a SES.

## Variables locales relevantes

Si quieres links de activación/reset al frontend local, usa:

```dotenv
KOMUNICARE_URL=http://localhost:3001
```

## Flujos a validar

1. Registro (`POST /user`) y validar mail de confirmación en MailHog.
2. Recuperación (`POST /user/forgot`) y validar mail de reset en MailHog.

## Apagar stack local

```bash
npm run stop-docker
```
