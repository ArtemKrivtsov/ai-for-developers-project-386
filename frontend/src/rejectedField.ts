import type { ApiError } from './generated/index.ts';

/** A field of a request body or path that a validation error may name. */
export type Field = NonNullable<ApiError['field']>;

/**
 * The field the server named when it rejected the request with 400 `validation_error`, if any.
 * The form shows its own text for it: the server's `message` is not for users. Without
 * a response the request never reached the server, and `error` is not an ApiError.
 */
export function rejectedField(error: ApiError, response: Response | undefined): Field | undefined {
  if (response?.status !== 400 || error.code !== 'validation_error') return undefined;
  return error.field;
}
