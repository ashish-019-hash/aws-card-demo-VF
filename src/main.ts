import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter';
import { configuration } from './config/configuration';
import { createOpenApiDocument } from './openapi';

async function bootstrap(): Promise<void> {
  process.env.TZ = 'UTC';
  const config = configuration();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  const document = createOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });
  await app.listen(config.port);
  Logger.log(`CardDemo API listening on ${config.port}`, 'Bootstrap');
}
void bootstrap();
