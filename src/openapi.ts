import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const JWT_BEARER_SCHEME = 'jwt';

export function createOpenApiDocument(
  app: INestApplication,
): ReturnType<typeof SwaggerModule.createDocument> {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('CardDemo API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, JWT_BEARER_SCHEME)
      .build(),
  );
}
