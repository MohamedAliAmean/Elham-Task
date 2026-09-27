import { ArgumentMetadata, ParseUUIDPipe, ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiError } from './api-error';

class BodyValidationPipe extends ValidationPipe {
  override async transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      throw ApiError.validation('Request body must be a JSON object.');
    }
    return super.transform(value, metadata);
  }
}

export function createValidationPipe() {
  return new BodyValidationPipe({
    transform: true,
    whitelist: true,
    forbidUnknownValues: true,
    stopAtFirstError: true,
    exceptionFactory: (errors) => ApiError.validation(formatErrors(errors)),
  });
}

export function uuidParamPipe(name: string) {
  return new ParseUUIDPipe({
    exceptionFactory: () => ApiError.validation(`${name} must be a valid UUID.`),
  });
}

function formatErrors(errors: ValidationError[]): string {
  const messages = errors.flatMap((e) => (e.constraints ? Object.values(e.constraints) : []));
  return messages.length > 0 ? messages.join(' ') : 'Request body is invalid.';
}
