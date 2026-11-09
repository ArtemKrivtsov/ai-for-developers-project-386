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

test('a created meeting type is returned with an id and goes to the end of the list', async () => {
  const app = buildTestApp();

  const created = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: {
      name: 'Разбор резюме',
      description: 'Пройдёмся по резюме.',
      durationMinutes: 45,
    },
  });

  expect(created.statusCode).toBe(201);
  const meetingType = created.json();
  expect(meetingType).toEqual({
    id: expect.any(String),
    name: 'Разбор резюме',
    description: 'Пройдёмся по резюме.',
    durationMinutes: 45,
  });

  const list = await request(app, { method: 'GET', url: '/api/meeting-types' });
  expect(list.json().at(-1)).toEqual(meetingType);
});

test('the server trims spaces around the name and the description', async () => {
  const app = buildTestApp();

  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: {
      name: '  Разбор резюме \n',
      description: ' \tПройдёмся по резюме.  ',
      durationMinutes: 30,
    },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    name: 'Разбор резюме',
    description: 'Пройдёмся по резюме.',
  });
});

test('a meeting type without a description gets an empty one', async () => {
  const app = buildTestApp();

  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: { name: 'Созвон', durationMinutes: 15 },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({ name: 'Созвон', description: '' });
});

test('meeting types may share a name', async () => {
  const app = buildTestApp();

  for (const durationMinutes of [30, 60]) {
    const response = await request(app, {
      method: 'POST',
      url: '/api/meeting-types',
      payload: { name: 'Консультация', durationMinutes },
    });
    expect(response.statusCode).toBe(201);
  }

  const list = await request(app, { method: 'GET', url: '/api/meeting-types' });
  expect(list.json().slice(-2)).toMatchObject([
    { name: 'Консультация', durationMinutes: 30 },
    { name: 'Консультация', durationMinutes: 60 },
  ]);
});

const validMeetingType = { name: 'Созвон', description: '', durationMinutes: 30 };

test.each([
  ['name is empty', { name: '' }, 'name'],
  ['name has only spaces', { name: '   ' }, 'name'],
  ['name is longer than 100 characters', { name: 'я'.repeat(101) }, 'name'],
  ['name is missing', { name: undefined }, 'name'],
  ['description is longer than 500 characters', { description: 'я'.repeat(501) }, 'description'],
  ['durationMinutes is not an offered duration', { durationMinutes: 50 }, 'durationMinutes'],
])(
  'creating a meeting type fails with a validation error when %s',
  async (_case, change, field) => {
    const app = buildTestApp();

    const response = await request(app, {
      method: 'POST',
      url: '/api/meeting-types',
      payload: { ...validMeetingType, ...change },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 'validation_error',
      message: expect.any(String),
      field,
    });
  },
);

test('creating a meeting type from a body that is not JSON fails with a validation error without a field', async () => {
  const app = buildTestApp();

  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    headers: { 'content-type': 'application/json' },
    payload: '{"name": "Созвон",',
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'validation_error', message: expect.any(String) });
});

test.each([
  ['there is no body', {}],
  [
    'the body is plain text',
    { headers: { 'content-type': 'text/plain' }, payload: 'Созвон на 30 минут' },
  ],
])(
  'creating a meeting type fails with a validation error without a field when %s',
  async (_case, body) => {
    const app = buildTestApp();

    const response = await request(app, { method: 'POST', url: '/api/meeting-types', ...body });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: 'validation_error', message: expect.any(String) });
  },
);

test('a meeting type can be read by its id', async () => {
  const app = buildTestApp();
  const created = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: { name: 'Разбор резюме', description: 'Пройдёмся по резюме.', durationMinutes: 45 },
  });

  const response = await request(app, {
    method: 'GET',
    url: `/api/meeting-types/${created.json().id}`,
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(created.json());
});

test('reading an unknown meeting type fails with meeting_type_not_found', async () => {
  const app = buildTestApp();

  const response = await request(app, {
    method: 'GET',
    url: '/api/meeting-types/5b0e8f2c-3d71-4a96-b8e4-1c2f7a9d6e30',
  });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ code: 'meeting_type_not_found', message: expect.any(String) });
});

test('reading a meeting type by an id that is not a UUID fails with a validation error', async () => {
  const app = buildTestApp();

  const response = await request(app, { method: 'GET', url: '/api/meeting-types/not-a-uuid' });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({
    code: 'validation_error',
    message: expect.any(String),
    field: 'meetingTypeId',
  });
});
