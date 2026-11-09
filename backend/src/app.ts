import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';
import { fileURLToPath } from 'node:url';

import { handlers } from './handlers.ts';

const specification = fileURLToPath(new URL('../../spec/generated/openapi.yaml', import.meta.url));

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(openapiGlue, { specification, serviceHandlers: handlers });
  return app;
}
