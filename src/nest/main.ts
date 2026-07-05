import 'reflect-metadata';
import { bootstrapNestApplication } from './nest.factory';

async function bootstrap() {
  await bootstrapNestApplication({
    port: Number(process.env.NEST_PORT || 10011),
  });
}

void bootstrap();
