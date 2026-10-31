import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Chatbot Analitik UMKM')
      .setVersion('1.0')
      .addCookieAuth(env.AUTH_COOKIE_NAME)
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.PORT);
}

await bootstrap();
