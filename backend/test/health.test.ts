import { afterAll, expect, test } from 'vitest';

import { buildApp } from '../src/app.ts';

const app = buildApp();

afterAll(() => app.close());

test('GET /api/health responds ok', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/health' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'ok' });
});
