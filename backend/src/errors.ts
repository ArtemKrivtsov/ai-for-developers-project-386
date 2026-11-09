import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
  FastifySchemaValidationError,
} from 'fastify';

import type { ApiError } from './generated/types.gen.ts';

/**
 * Answers a request that breaks the contract with 400 and an `ApiError` of `validation_error`.
 * A schema error names the first invalid field: a body property or a path parameter. A body
 * that is not JSON names none. Other errors go on to Fastify's default handler.
 */
export function handleError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error.statusCode !== 400) throw error;

  const apiError: ApiError = { code: 'validation_error', message: error.message };
  const field = error.validation && fieldOf(error.validation[0]);
  if (field) apiError.field = field;
  return reply.code(400).send(apiError);
}

function fieldOf(error: FastifySchemaValidationError): string | undefined {
  if (error.keyword === 'required') return String(error.params.missingProperty);
  // `/name` for a body property, `/meetingTypeId` for a path parameter, empty for the whole body.
  return error.instancePath.split('/')[1] || undefined;
}
