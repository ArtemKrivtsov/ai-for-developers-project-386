import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import openapiGlue from 'fastify-openapi-glue';
import { fileURLToPath } from 'node:url';

import { createCalendar } from './calendar.ts';
import { handleError } from './errors.ts';
import { createHandlers } from './handlers.ts';

const specification = fileURLToPath(new URL('../../spec/generated/openapi.yaml', import.meta.url));
const frontendBuild = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export type AppOptions = {
  /** Serve the frontend build from `frontend/dist`. API tests build the app without it. */
  serveFrontend?: boolean;
};

export function buildApp({ serveFrontend = false }: AppOptions = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const serviceHandlers = createHandlers(createCalendar());
  app.setErrorHandler(handleError);
  app.register(openapiGlue, { specification, serviceHandlers });
  if (serveFrontend) {
    app.register(frontend);
  }
  return app;
}

/** The SPA has no server rendering (ADR 0001): a GET that matches no file gets `index.html`. */
async function frontend(app: FastifyInstance) {
  // Routes each file of the build at startup and leaves `/*` to the fallback below.
  await app.register(fastifyStatic, { root: frontendBuild, wildcard: false });
  app.get('/*', (_request, reply) => reply.sendFile('index.html'));
  // An unknown API path gets the standard Fastify 404, not the page.
  app.get('/api/*', (_request, reply) => reply.callNotFound());
}
