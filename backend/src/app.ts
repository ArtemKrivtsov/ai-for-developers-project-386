import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';
import { fileURLToPath } from 'node:url';

import { createCalendar } from './calendar.ts';
import { createHandlers } from './handlers.ts';

const specification = fileURLToPath(new URL('../../spec/generated/openapi.yaml', import.meta.url));

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const serviceHandlers = createHandlers(createCalendar());
  app.register(openapiGlue, { specification, serviceHandlers });
  return app;
}
