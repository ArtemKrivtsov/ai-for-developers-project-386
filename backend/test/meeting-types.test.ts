import { expect, test } from 'vitest';

import { buildTestApp, request } from './api.ts';

test('a new server lists the starter meeting types in creation order', async () => {
  const app = buildTestApp();

  const response = await request(app, { method: 'GET', url: '/api/meeting-types' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([
    {
      id: expect.any(String),
      name: 'Знакомство',
      description: expect.stringMatching(/\S/),
      durationMinutes: 30,
    },
    {
      id: expect.any(String),
      name: 'Консультация',
      description: expect.stringMatching(/\S/),
      durationMinutes: 60,
    },
  ]);
});
