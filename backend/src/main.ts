import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // Optimized app creation with performance settings
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
    logger: ['error', 'warn', 'log'], // Reduce logging for better performance
  });

  // Optimized validation pipe for performance
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true, // Better performance
    },
    disableErrorMessages: process.env.NODE_ENV === 'production', // Performance optimization
  }));

  // Enable trust proxy for better load balancing
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Swagger documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('K6 Demo API')
      .setDescription('High-performance API for demonstrating K6 testing capabilities')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Health', 'Health check endpoints')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Products', 'Product management')
      .addTag('Upload', 'File upload endpoints')
      .addTag('Simulation', 'Performance simulation endpoints')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Performance optimizations
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`⚡ Performance optimizations enabled`);
}

bootstrap();
