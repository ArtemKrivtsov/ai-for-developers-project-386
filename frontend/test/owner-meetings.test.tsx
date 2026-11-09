import { screen, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import type { Meeting } from '../src/generated/index.ts';
import { handleListUpcomingMeetings } from '../src/generated/msw.gen.ts';
import { server } from './msw.ts';
import { renderAt } from './render.tsx';

const introduction: Meeting = {
  id: '3f6a1c2e-8b4d-4e7a-9c15-6d2b0e8f4a71',
  meetingType: {
    id: '7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10',
    name: 'Знакомство',
    description: 'Короткий звонок.',
    durationMinutes: 30,
  },
  start: '2026-11-10T09:00:00+03:00',
  end: '2026-11-10T09:30:00+03:00',
  guestName: 'Иван Петров',
  guestEmail: 'ivan@example.com',
};

const consultation: Meeting = {
  id: 'a2b7e9d4-1c3f-4a68-b05e-7f9d2c4e6b83',
  meetingType: {
    id: 'c1e9b0d2-5a37-4f6e-8b24-9e0d7a3f5c61',
    name: 'Консультация',
    description: '',
    durationMinutes: 90,
  },
  start: '2026-11-12T16:00:00+03:00',
  end: '2026-11-12T17:30:00+03:00',
  guestName: 'Мария Иванова',
  guestEmail: 'Maria@Example.com',
};

test('the owner panel links to the meetings and highlights them on /owner', async () => {
  server.use(handleListUpcomingMeetings({ body: [] }));

  renderAt('/owner');

  const panel = screen.getByRole('navigation', { name: 'Владелец' });
  const meetings = within(panel).getByRole('link', { name: 'Встречи' });
  expect(meetings).toHaveAttribute('href', '/owner');
  expect(meetings).toHaveAttribute('aria-current', 'page');
  expect(within(panel).getByRole('link', { name: 'Типы встреч' })).not.toHaveAttribute(
    'aria-current',
  );
  await screen.findByText('Предстоящих встреч нет');
});

test('an unknown address inside /owner shows the not-found page', () => {
  renderAt('/owner/no-such-page');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Страница не найдена' }),
  ).toBeInTheDocument();
});

test('the owner sees upcoming meetings as cards in the order from the server', async () => {
  server.use(handleListUpcomingMeetings({ body: [introduction, consultation] }));

  renderAt('/owner');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Предстоящие встречи' }),
  ).toBeInTheDocument();
  expect(screen.getByText('время московское (UTC+3)')).toBeInTheDocument();
  const cards = await screen.findAllByRole('article');
  expect(cards).toHaveLength(2);

  expect(
    within(cards[0]).getByRole('heading', { name: 'вторник, 10 ноября, 09:00–09:30' }),
  ).toBeInTheDocument();
  expect(within(cards[0]).getByText('Знакомство')).toBeInTheDocument();
  expect(within(cards[0]).getByText('30 мин')).toBeInTheDocument();
  expect(within(cards[0]).getByText('Иван Петров, ivan@example.com')).toBeInTheDocument();

  expect(
    within(cards[1]).getByRole('heading', { name: 'четверг, 12 ноября, 16:00–17:30' }),
  ).toBeInTheDocument();
  expect(within(cards[1]).getByText('Консультация')).toBeInTheDocument();
  expect(within(cards[1]).getByText('1 ч 30 мин')).toBeInTheDocument();
  expect(within(cards[1]).getByText('Мария Иванова, Maria@Example.com')).toBeInTheDocument();
});

test('meeting times are Moscow ones in a browser far from Moscow', async () => {
  // 09:00 on Tuesday in Moscow is still 22:00 on Monday, 9 November, in Los Angeles.
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
  server.use(handleListUpcomingMeetings({ body: [introduction] }));

  renderAt('/owner');

  const card = await screen.findByRole('article');
  expect(
    within(card).getByRole('heading', { name: 'вторник, 10 ноября, 09:00–09:30' }),
  ).toBeInTheDocument();
});

test('the owner is told when there are no upcoming meetings', async () => {
  server.use(handleListUpcomingMeetings({ body: [] }));

  renderAt('/owner');

  expect(await screen.findByText('Предстоящих встреч нет')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

test('the owner sees a loading indicator until the meetings arrive', async () => {
  server.use(handleListUpcomingMeetings({ body: [introduction] }));

  renderAt('/owner');

  expect(screen.getByRole('status', { name: 'Загрузка' })).toBeInTheDocument();
  await screen.findByRole('article');
  expect(screen.queryByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
});

test.each([
  ['the server fails', () => new HttpResponse(null, { status: 500 })],
  ['the network fails', () => HttpResponse.error()],
])('the owner is asked to reload the page when %s', async (_case, resolver) => {
  server.use(handleListUpcomingMeetings(resolver));

  renderAt('/owner');

  expect(
    await screen.findByText('Не удалось загрузить встречи. Обновите страницу.'),
  ).toBeInTheDocument();
  expect(screen.queryByText('Предстоящих встреч нет')).not.toBeInTheDocument();
});
