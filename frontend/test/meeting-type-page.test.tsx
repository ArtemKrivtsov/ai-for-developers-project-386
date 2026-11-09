import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import type { ApiError, Slot } from '../src/generated/index.ts';
import { handleGetMeetingType, handleListSlots } from '../src/generated/msw.gen.ts';
import {
  id,
  meetingType,
  notFound,
  serve,
  slotDays,
  thursdaySlots,
} from './meeting-type-fixture.ts';
import { server } from './msw.ts';
import { renderAt } from './render.tsx';

const invalidId: ApiError = { code: 'validation_error', message: 'Bad id', field: 'meetingTypeId' };

test.each([
  ['an unknown meeting type', `/book/${id}`, () => HttpResponse.json(notFound, { status: 404 })],
  ['an id that is not a UUID', '/book/abc', () => HttpResponse.json(invalidId, { status: 400 })],
])('the page of %s says it is not found and links to the catalog', async (_case, path, reply) => {
  server.use(handleGetMeetingType(reply), handleListSlots(reply));

  renderAt(path);

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Тип встречи не найден' }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('main')).getByRole('link', { name: 'К списку типов встреч' }),
  ).toHaveAttribute('href', '/book');
});

const failures = [
  ['the server fails', () => new HttpResponse(null, { status: 500 })],
  ['the network fails', () => HttpResponse.error()],
] as const;

test.each(failures)(
  'the page asks to reload when the meeting type fails to load because %s',
  async (_case, reply) => {
    server.use(handleGetMeetingType(reply), handleListSlots(reply));

    renderAt(`/book/${id}`);

    expect(
      await screen.findByText('Не удалось загрузить тип встречи. Обновите страницу.'),
    ).toBeInTheDocument();
  },
);

test('the page shows a loading indicator until the meeting type and its slots arrive', async () => {
  serve(slotDays({ '2026-11-12': thursdaySlots }));

  renderAt(`/book/${id}`);

  expect(screen.getByRole('status', { name: 'Загрузка' })).toBeInTheDocument();
  await screen.findByRole('button', { name: '09:00–09:30' });
  expect(screen.queryByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
});

test('the page is titled by the meeting type and shows its duration and description', async () => {
  serve(slotDays({ '2026-11-12': thursdaySlots }));

  renderAt(`/book/${id}`);

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Разбор резюме' }),
  ).toBeInTheDocument();
  const summary = screen.getByRole('region', { name: 'Встреча' });
  expect(within(summary).getByText('30 мин')).toBeInTheDocument();
  expect(
    within(summary).getByText('Пройдёмся по резюме и сопроводительному письму.'),
  ).toBeInTheDocument();
  expect(within(summary).getByText('Дата')).toBeInTheDocument();
  expect(within(summary).getByText('Время')).toBeInTheDocument();
  expect(within(summary).getByText('время московское (UTC+3)')).toBeInTheDocument();
});

const fridaySlots: Slot[] = [
  { start: '2026-11-13T14:00:00+03:00', end: '2026-11-13T14:30:00+03:00' },
];
const mondaySlots: Slot[] = [
  { start: '2026-11-16T17:30:00+03:00', end: '2026-11-16T18:00:00+03:00' },
];

test('the days of the window fill a grid from Monday to Sunday, and days without slots are gray', async () => {
  serve(
    slotDays({ '2026-11-12': thursdaySlots, '2026-11-13': fridaySlots, '2026-11-16': mondaySlots }),
  );

  renderAt(`/book/${id}`);

  const dayColumn = await screen.findByRole('region', { name: 'День' });
  expect(within(dayColumn).getByText('10 нояб. – 23 нояб.')).toBeInTheDocument();
  const grid = within(dayColumn).getByRole('table');
  expect(
    within(grid)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent),
  ).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  const weeks = within(grid).getAllByRole('row').slice(1);
  expect(
    weeks.map((week) =>
      within(week)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ),
  ).toEqual([
    ['', '10', '11', '12', '13', '14', '15'],
    ['16', '17', '18', '19', '20', '21', '22'],
    ['23', '', '', '', '', '', ''],
  ]);
  const days = within(grid).getAllByRole('button');
  expect(days).toHaveLength(14);
  expect(days.filter((day) => !day.hasAttribute('disabled')).map((day) => day.textContent)).toEqual(
    ['12', '13', '16'],
  );
  expect(within(grid).getByRole('button', { name: 'вторник, 10 ноября' })).toBeDisabled();
  expect(
    within(dayColumn).getByText('Серые дни недоступны: выходные или всё занято.'),
  ).toBeInTheDocument();
});

const dayButton = (name: string) => within(screen.getByRole('table')).getByRole('button', { name });
const summary = () => screen.getByRole('region', { name: 'Встреча' });
const timeColumn = () => screen.getByRole('region', { name: 'Время' });
const slotButtons = () =>
  within(timeColumn())
    .getAllByRole('button')
    .map((button) => button.textContent);

test('the first day with slots is chosen at first, and the right column shows its slots', async () => {
  serve(slotDays({ '2026-11-12': thursdaySlots, '2026-11-13': fridaySlots }));

  renderAt(`/book/${id}`);

  await screen.findByRole('table');
  expect(dayButton('четверг, 12 ноября')).toHaveAttribute('aria-pressed', 'true');
  expect(dayButton('пятница, 13 ноября')).toHaveAttribute('aria-pressed', 'false');
  expect(within(timeColumn()).getByText('четверг, 12 ноября')).toBeInTheDocument();
  expect(within(timeColumn()).getByText('время московское (UTC+3)')).toBeInTheDocument();
  expect(slotButtons()).toEqual(['09:00–09:30', '09:30–10:00']);
  expect(within(summary()).getByText('четверг, 12 ноября')).toBeInTheDocument();
  expect(within(summary()).getByText('Не выбрано')).toBeInTheDocument();
});

test('choosing a day shows its slots', async () => {
  serve(slotDays({ '2026-11-12': thursdaySlots, '2026-11-13': fridaySlots }));
  renderAt(`/book/${id}`);
  await screen.findByRole('table');

  await userEvent.click(dayButton('пятница, 13 ноября'));

  expect(dayButton('пятница, 13 ноября')).toHaveAttribute('aria-pressed', 'true');
  expect(dayButton('четверг, 12 ноября')).toHaveAttribute('aria-pressed', 'false');
  expect(within(timeColumn()).getByText('пятница, 13 ноября')).toBeInTheDocument();
  expect(slotButtons()).toEqual(['14:00–14:30']);
  expect(within(summary()).getByText('пятница, 13 ноября')).toBeInTheDocument();
});

test('choosing a slot shows it on the left until another day is chosen', async () => {
  serve(slotDays({ '2026-11-12': thursdaySlots, '2026-11-13': fridaySlots }));
  renderAt(`/book/${id}`);
  await screen.findByRole('table');

  await userEvent.click(within(timeColumn()).getByRole('button', { name: '09:30–10:00' }));

  expect(within(summary()).getByText('четверг, 12 ноября')).toBeInTheDocument();
  expect(within(summary()).getByText('09:30–10:00')).toBeInTheDocument();

  await userEvent.click(dayButton('пятница, 13 ноября'));

  expect(within(summary()).getByText('Не выбрано')).toBeInTheDocument();
  expect(slotButtons()).toEqual(['14:00–14:30']);
});

test('dates and times are Moscow ones in a browser far from Moscow', async () => {
  // 09:00 in Moscow is still 11 November, 22:00 in Los Angeles.
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
  serve(
    slotDays({
      '2026-11-12': [
        { start: '2026-11-12T09:00:00+03:00', end: '2026-11-12T10:00:00+03:00' },
        { start: '2026-11-12T17:00:00+03:00', end: '2026-11-12T18:00:00+03:00' },
      ],
    }),
  );

  renderAt(`/book/${id}`);

  expect(await screen.findByRole('table')).toBeInTheDocument();
  expect(dayButton('четверг, 12 ноября')).toHaveTextContent('12');
  expect(within(timeColumn()).getByText('четверг, 12 ноября')).toBeInTheDocument();
  expect(slotButtons()).toEqual(['09:00–10:00', '17:00–18:00']);
  await userEvent.click(within(timeColumn()).getByRole('button', { name: '09:00–10:00' }));
  expect(within(summary()).getByText('четверг, 12 ноября')).toBeInTheDocument();
  expect(within(summary()).getByText('09:00–10:00')).toBeInTheDocument();
});

test('a window without free time says so instead of the grid', async () => {
  serve(slotDays());

  renderAt(`/book/${id}`);

  expect(
    await screen.findByText('В ближайшие 14 дней свободного времени нет.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(
    screen.queryByText('Серые дни недоступны: выходные или всё занято.'),
  ).not.toBeInTheDocument();
  expect(within(summary()).getByText('Не выбрана')).toBeInTheDocument();
  expect(within(summary()).getByText('Не выбрано')).toBeInTheDocument();
});

test.each(failures)(
  'the page asks to reload when the free time fails to load because %s',
  async (_case, reply) => {
    server.use(handleGetMeetingType({ body: meetingType }), handleListSlots(reply));

    renderAt(`/book/${id}`);

    expect(
      await screen.findByText('Не удалось загрузить свободное время. Обновите страницу.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Разбор резюме' })).toBeInTheDocument();
  },
);
