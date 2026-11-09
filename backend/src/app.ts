import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type RouteOptions } from 'fastify';
import openapiGlue from 'fastify-openapi-glue';
import { fileURLToPath } from 'node:url';

import { type Clock, createCalendar } from './calendar.ts';
import { handleError } from './errors.ts';
import { createHandlers } from './handlers.ts';

const specification = fileURLToPath(new URL('../../spec/generated/openapi.yaml', import.meta.url));
const frontendBuild = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export type AppOptions = {
  /** The clock of the time rules, real time by default. API tests pass a fixed one. */
  now?: Clock;
  /** Serve the frontend build from `frontend/dist`. API tests build the app without it. */
  serveFrontend?: boolean;
};

export function buildApp({ now = () => new Date(), serveFrontend = false }: AppOptions = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    // A JSON body has types of its own: `"30"` or `null` in place of a number or a string breaks
    // the contract instead of turning into one. Every path parameter in the contract is a string,
    // so none needs converting either.
    ajv: { customOptions: { coerceTypes: false } },
  });
  const serviceHandlers = createHandlers(createCalendar({ now }));
  app.setErrorHandler(handleError);
  app.addHook('onRoute', checkEveryBody);
  app.register(openapiGlue, { specification, serviceHandlers });
  if (serveFrontend) {
    app.register(frontend);
  }
  return app;
}

type BodySchema = { content?: Record<string, { schema: unknown }> };

/**
 * fastify-openapi-glue gives Fastify the body schema by content type, and Fastify skips the check
 * when a request has no body or a body of another type. Every body in the contract is JSON,
 * so its schema checks every request: a missing or plain-text body breaks it as well.
 */
function checkEveryBody(route: RouteOptions) {
  const json = (route.schema?.body as BodySchema | undefined)?.content?.['application/json'];
  if (route.schema && json) route.schema.body = json.schema;
}

/** The SPA has no server rendering (ADR 0001): a GET that matches no file gets `index.html`. */
async function frontend(app: FastifyInstance) {
  // Routes each file of the build at startup and leaves `/*` to the fallback below.
  await app.register(fastifyStatic, { root: frontendBuild, wildcard: false });
  app.get('/*', (_request, reply) => reply.sendFile('index.html'));
  // The API root and an unknown API path get the standard Fastify 404, not the page.
  for (const api of ['/api', '/api/*']) {
    app.get(api, (_request, reply) => reply.callNotFound());
  }
}
