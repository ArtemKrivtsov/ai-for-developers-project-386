import { screen, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { handleListMeetingTypes } from '../src/generated/msw.gen.ts';
import { server } from './msw.ts';
import { renderAt } from './render.tsx';

test('the catalog shows each meeting type as a card linking to its page', async () => {
  server.use(
    handleListMeetingTypes({
      body: [
        {
          id: '7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10',
          name: 'Разбор резюме',
          description: 'Пройдёмся по резюме и сопроводительному письму.',
          durationMinutes: 30,
        },
        {
          id: 'c1e9b0d2-5a37-4f6e-8b24-9e0d7a3f5c61',
          name: 'Сессия по архитектуре',
          description: 'Обсудим устройство вашего сервиса.',
          durationMinutes: 60,
        },
      ],
    }),
  );

  renderAt('/book');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Выберите тип встречи' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Нажмите на карточку, чтобы выбрать день и время.')).toBeInTheDocument();

  const cards = await within(screen.getByRole('main')).findAllByRole('link');
  expect(cards).toHaveLength(2);

  expect(cards[0]).toHaveAttribute('href', '/book/7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10');
  expect(within(cards[0]).getByRole('heading', { name: 'Разбор резюме' })).toBeInTheDocument();
  expect(within(cards[0]).getByText('30 мин')).toBeInTheDocument();
  expect(
    within(cards[0]).getByText('Пройдёмся по резюме и сопроводительному письму.'),
  ).toBeInTheDocument();

  expect(cards[1]).toHaveAttribute('href', '/book/c1e9b0d2-5a37-4f6e-8b24-9e0d7a3f5c61');
  expect(
    within(cards[1]).getByRole('heading', { name: 'Сессия по архитектуре' }),
  ).toBeInTheDocument();
  expect(within(cards[1]).getByText('1 ч')).toBeInTheDocument();
});

test.each([
  [15, '15 мин'],
  [30, '30 мин'],
  [45, '45 мин'],
  [60, '1 ч'],
  [90, '1 ч 30 мин'],
  [120, '2 ч'],
] as const)('a %i-minute meeting type shows «%s» on its card', async (durationMinutes, label) => {
  server.use(
    handleListMeetingTypes({
      body: [
        {
          id: '0b8f6e3a-2c41-4d7e-a9f5-6e1d3b7c8a24',
          name: 'Созвон',
          description: '',
          durationMinutes,
        },
      ],
    }),
  );

  renderAt('/book');

  const card = await within(screen.getByRole('main')).findByRole('link');
  expect(within(card).getByText(label)).toBeInTheDocument();
});

test('the catalog shows a loading indicator until the meeting types arrive', async () => {
  server.use(handleListMeetingTypes({ body: [] }));

  renderAt('/book');

  expect(screen.getByRole('status', { name: 'Загрузка' })).toBeInTheDocument();
  await screen.findByText('Владелец ещё не завёл ни одного типа встречи.');
  expect(screen.queryByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
});

test('the catalog says so when the owner has no meeting types', async () => {
  server.use(handleListMeetingTypes({ body: [] }));

  renderAt('/book');

  expect(
    await screen.findByText('Владелец ещё не завёл ни одного типа встречи.'),
  ).toBeInTheDocument();
});

test.each([
  ['the server fails', () => new HttpResponse(null, { status: 500 })],
  ['the network fails', () => HttpResponse.error()],
])('the catalog asks to reload the page when %s', async (_case, resolver) => {
  server.use(handleListMeetingTypes(resolver));

  renderAt('/book');

  expect(
    await screen.findByText('Не удалось загрузить типы встреч. Обновите страницу.'),
  ).toBeInTheDocument();
});
