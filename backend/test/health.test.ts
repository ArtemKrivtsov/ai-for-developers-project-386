import { expect, test } from 'vitest';

import { buildTestApp, request } from './api.ts';

test('GET /api/health responds ok', async () => {
  const app = buildTestApp();

  const response = await request(app, { method: 'GET', url: '/api/health' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'ok' });
});
