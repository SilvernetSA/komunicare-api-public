# Komunicare API (edición pública)

API backend de la plataforma CAA Komunicare. Da servicio a la experiencia web, los flujos de terapeutas y administración, suscripciones, medios y funciones asistidas por IA. Deriva de [cboard-api](https://github.com/cboard-org/cboard-api); se conserva la licencia GNU GPLv3 de acuerdo con su origen.

## Relación con otros productos

- El frontend público consulta aquí autenticación, tableros, comunicadores, medios, suscripciones y otros datos.
- Backoffice y la aplicación de teclado también consumen el dominio backend, pero no están incluidos en este repositorio público.

## Requisitos y configuración

- Node.js LTS y pnpm (el repositorio incluye `pnpm-lock.yaml`).
- MongoDB accesible desde el entorno local.
- Docker solo para ejecutar el stack local en contenedores.

No se incluyen archivos reales de entorno. Para Docker, crea `.env.local` (lo carga `docker-compose.local.yml`). Para ejecutar directamente, exporta las variables en la terminal o crea `.env` local. No subas secretos.

Variables mínimas habituales:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL_DEV` o `MONGO_URL` | URL de conexión a MongoDB. |
| `API_SESSION_SECRET`, `JWT_SECRET`, `JWT_ISSUER` | Sesiones y autenticación. Usa valores locales propios. |
| `KOMUNICARE_URL` | URL base del frontend para enlaces, correos y retornos de pago. |
| `BACKOFFICE_URL` | URL del backoffice para flujos administrativos. |
| `PORT` | Puerto HTTP; localmente se usa `10010`. |

Las integraciones solo requieren configuración si se prueban: correo (`SMTP_*`, `SES_*`), pagos (`MERCADOPAGO_*`, `PAYPAL_*`), almacenamiento (`AZURE_STORAGE_CONNECTION_STRING`, `BLOB_*`) e IA (`OPEN_AI_API_KEY`, `AI_ENGINE_LAMBDA_URL`, `AI_ENGINE_LAMBDA_API_KEY`). Otros nombres se consultan en los archivos de configuración del proyecto; nunca publiques sus valores.

## Ejecución local

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

La API escucha normalmente en `http://localhost:10010`; Swagger/OpenAPI está en `/docs`.

Para ejecutar API y MailHog en Docker, prepara `.env.local` y usa:

```bash
pnpm run build-docker
pnpm run run-docker
```

MailHog queda disponible en `http://localhost:8026`. Para detener el stack: `pnpm run stop-docker`. Consulta `MAILHOG_LOCAL.md` para validar registro y recuperación de contraseña.

## Compilación y pruebas

```bash
pnpm run build
pnpm test
```

También están disponibles `pnpm run dev-https`, `pnpm run run-docker-https` y `pnpm run start-build`.

## Despliegue público con GitHub Actions

La edición pública no incluye de antemano servidores de despliegue, nombre de imagen Docker ni URL de desarrollo. Antes de habilitar esos flujos, configura en GitHub:

- Variable `DOCKER_IMAGE_NAME` con el nombre completo de la imagen a publicar.
- Secretos `DOCKER_USERNAME` y `DOCKER_PASSWORD` para Docker Hub.
- Secretos `DEPLOY_HOST_DEV` y `DEPLOY_HOST_PROD` con los hosts de despliegue.
- Secreto `KOMUNICARE_URL_DEV` con la URL base del frontend de desarrollo.
- Los demás secretos de runtime usados por los workflows, incluidos base de datos, claves de aplicación, pagos e IA.

Swagger/OpenAPI está disponible en `http://localhost:10010/docs` al ejecutar el servidor. Licencia: `GPL-3.0-only` (ver `LICENSE`).
