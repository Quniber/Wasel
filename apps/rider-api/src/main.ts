import { join } from 'path';
// Load env from monorepo-root/.env with override:true so values always win
// over PM2's stale cached env (PM2 doesn't unset vars on --update-env).
require('dotenv').config({ path: join(__dirname, '..', '..', '..', '.env'), override: true });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Rider API running on http://localhost:${port}`);
}
bootstrap();
