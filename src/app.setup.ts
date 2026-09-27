import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { createValidationPipe } from './common/validation';

/** Shared by main.ts and the e2e tests so both run the exact same pipeline. */
export function configureApp(app: INestApplication): void {
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());

  SwaggerModule.setup('docs', app, buildOpenApiDocument(app), {
    jsonDocumentUrl: 'openapi.json',
    raw: ['json'],
  });
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Appointment Booking API')
    .setVersion('1.0.0')
    .setDescription(
      [
        'Mini API for booking fixed, pre-seeded appointment slots.',
        '',
        '- All request/response bodies are JSON; ids are UUID strings; timestamps are ISO 8601 in UTC.',
        '- **No authentication** is required for any endpoint.',
        '- Errors always use `{"error":{"code","message"}}`.',
        '- A slot accepts exactly one active booking; concurrent requests for the same slot yield one `201` and `409` for the rest.',
        '- Real-time Socket.IO events (`slot.booked`, `slot.released`) are documented in the README.',
      ].join('\n'),
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.security = [];
  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (operation && typeof operation === 'object' && 'responses' in operation) operation.security = [];
    }
  }
  return document;
}
