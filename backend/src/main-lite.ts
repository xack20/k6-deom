import { NestFactory } from '@nestjs/core';
import { AppModuleLite } from './app-lite.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModuleLite, {
    cors: true,
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Lite server running on http://localhost:${port}`);
  console.log(`⚡ Health endpoint: http://localhost:${port}/api/v1/health`);
}

bootstrap();
