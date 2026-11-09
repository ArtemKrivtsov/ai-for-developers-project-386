import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { readFileSync } from 'node:fs';
import { assert, onTestFinished } from 'vitest';
import { parse } from 'yaml';

import { type AppOptions, buildApp } from '../src/app.ts';
import type { MeetingType, NewMeetingType } from '../src/generated/types.gen.ts';

type Operation = { operationId: string; responses: Record<string, Response> };
type Response = { content?: Record<string, unknown> };
type Document = { paths: Record<string, Record<string, Operation>> };

const documentId = 'openapi';
const document: Document = parse(
  readFileSync(new URL('../../spec/generated/openapi.yaml', import.meta.url), 'utf8'),
);
// An OpenAPI document is not a JSON Schema: strict mode rejects its top-level keys
// and OpenAPI-only keywords such as `example`.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats.default(ajv);
ajv.addSchema(document, documentId);

/**
 * Builds an app with an empty store for the current test and closes it when the test ends.
 * A test of the time rules passes a fixed clock `now`, others get real time.
 */
export function buildTestApp({ now }: Pick<AppOptions, 'now'> = {}): FastifyInstance {
  const app = buildApp({ now });
  onTestFinished(() => app.close());
  return app;
}

/**
 * Sends a request like `app.inject` and fails the test when the response breaks the contract:
 * the status code is not declared for the operation or the body does not match its schema.
 */
export async function request(
  app: FastifyInstance,
  options: InjectOptions & { method: string; url: string },
): Promise<LightMyRequestResponse> {
  const response = await app.inject(options);
  const where = `${options.method} ${options.url} → ${response.statusCode}`;
  const { pointer, operation } = findOperation(options.method, options.url);

  const status = String(response.statusCode);
  assert(
    status in operation.responses,
    `${where}: status is not declared for ${operation.operationId}`,
  );

  const content = operation.responses[status].content;
  if (!content) {
    assert.strictEqual(response.body, '', `${where}: the contract declares no body`);
    return response;
  }

  assert.match(String(response.headers['content-type']), /^application\/json/, where);
  const validate = ajv.getSchema(
    `${documentId}#${pointer}/responses/${status}/content/application~1json/schema`,
  );
  assert(validate, `${where}: the contract declares no JSON body`);
  assert(
    validate(response.json()),
    `${where}: body does not match the contract: ${ajv.errorsText(validate.errors)}`,
  );
  return response;
}

/** Monday, 9 November 2026, noon in Moscow: the booking window runs from 10 to 23 November. */
export const monday = () => new Date('2026-11-09T12:00:00+03:00');

/** Creates a meeting type named «Созвон» for 30 minutes, unless `fields` say otherwise. */
export async function createMeetingType(
  app: FastifyInstance,
  fields: Partial<NewMeetingType> = {},
): Promise<MeetingType> {
  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: { name: 'Созвон', durationMinutes: 30, ...fields },
  });
  assert.strictEqual(response.statusCode, 201, 'the meeting type is not created');
  return response.json();
}

/**
 * Asks for a meeting of the meeting type for Иван Петров, ivan@example.com. `fields` add
 * the start and may replace the guest or break the body.
 */
export function createMeeting(
  app: FastifyInstance,
  meetingTypeId: string,
  fields: Record<string, unknown>,
) {
  return request(app, {
    method: 'POST',
    url: `/api/meeting-types/${meetingTypeId}/meetings`,
    payload: { guestName: 'Иван Петров', guestEmail: 'ivan@example.com', ...fields },
  });
}

function findOperation(method: string, url: string) {
  const path = new URL(url, 'http://localhost').pathname;
  for (const [template, item] of Object.entries(document.paths)) {
    const operation = item[method.toLowerCase()];
    if (operation && templateToRegExp(template).test(path)) {
      return { pointer: `/paths/${escapePointer(template)}/${method.toLowerCase()}`, operation };
    }
  }
  assert.fail(`${method} ${url} matches no operation in the contract`);
}

function templateToRegExp(template: string) {
  const escaped = template.replaceAll(/[.*+?^$()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll(/\{[^}]+\}/g, '[^/]+')}$`);
}

function escapePointer(segment: string) {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}
