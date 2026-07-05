import 'dotenv-defaults/config';
import { bootstrapNestApplication } from './nest/nest.factory';

void bootstrapNestApplication().catch((error) => {
  console.error('Could not initialize application:', error);
  process.exit(1);
});
