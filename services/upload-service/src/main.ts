import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppModule } from './app.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // Ensure image directories exist
  const imageDirs = [
    join(process.cwd(), 'images', 'products'),
    join(process.cwd(), 'images', 'files'),
    join(process.cwd(), 'images', 'hero'),
    join(process.cwd(), 'images', 'categories'),
    join(process.cwd(), 'images', 'logos'),
    join(process.cwd(), 'images', 'users'),
    // Keep uploads for backward compatibility
    join(process.cwd(), 'uploads', 'products'),
    join(process.cwd(), 'uploads', 'files'),
    join(process.cwd(), 'uploads', 'hero'),
    join(process.cwd(), 'uploads', 'categories'),
  ];
  imageDirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');

  // Serve static files from images directory (primary)
  app.useStaticAssets(join(process.cwd(), 'images'), {
    prefix: '/images',
  });
  
  // Keep uploads for backward compatibility
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Pipes - Allow extra fields for file uploads
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for multipart/form-data
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: true,
      skipNullProperties: true,
      skipUndefinedProperties: true,
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('FurniMart Upload Service')
    .setDescription('Upload Service')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const PORT = process.env.PORT || 3012;
  await app.listen(PORT);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 Upload Service running on http://localhost:${PORT}/api`);
  }
}

bootstrap().catch((err: Error) => {
  console.error(`❌ Failed to start upload-service:`, err);
  process.exit(1);
});
