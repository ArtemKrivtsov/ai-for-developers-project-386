import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import type { ApiError, Meeting, NewMeeting } from '../src/generated/index.ts';
import { handleCreateMeeting } from '../src/generated/msw.gen.ts';
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

const summary = () => screen.getByRole('region', { name: 'Встреча' });
const timeColumn = () => screen.getByRole('region', { name: 'Время' });
const form = () => screen.getByRole('region', { name: 'Ваши данные' });
const nameField = () => within(form()).getByRole('textbox', { name: 'Имя' });
const emailField = () => within(form()).getByRole('textbox', { name: 'Email' });

async function fill(field: HTMLElement, text: string) {
  await userEvent.clear(field);
  await userEvent.click(field);
  await userEvent.paste(text);
}

/** Opens the page of the meeting type with slots on Thursday, 12 November, and chooses one. */
async function chooseSlot(slot: string) {
  serve(slotDays({ '2026-11-12': thursdaySlots }));
  renderAt(`/book/${id}`);
  await screen.findByRole('table');
  await userEvent.click(within(timeColumn()).getByRole('button', { name: slot }));
}

test('choosing a slot replaces the slots with the guest form, and «Другое время» brings them back', async () => {
  await chooseSlot('09:30–10:00');

  expect(screen.queryByRole('region', { name: 'Время' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'День' })).toBeInTheDocument();
  expect(within(summary()).getByText('09:30–10:00')).toBeInTheDocument();
  expect(nameField()).toHaveValue('');
  expect(emailField()).toHaveValue('');
  expect(within(form()).getByRole('button', { name: 'Записаться' })).toBeInTheDocument();

  await fill(nameField(), 'Иван Петров');
  await fill(emailField(), 'ivan@example.com');
  await userEvent.click(within(form()).getByRole('button', { name: 'Другое время' }));

  expect(screen.queryByRole('region', { name: 'Ваши данные' })).not.toBeInTheDocument();
  expect(
    within(timeColumn())
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['09:00–09:30', '09:30–10:00']);
  expect(within(summary()).getByText('Не выбрано')).toBeInTheDocument();

  await userEvent.click(within(timeColumn()).getByRole('button', { name: '09:00–09:30' }));

  expect(within(summary()).getByText('09:00–09:30')).toBeInTheDocument();
  expect(nameField()).toHaveValue('Иван Петров');
  expect(emailField()).toHaveValue('ivan@example.com');
});

test.each([
  ['the name is empty', '', 'ivan@example.com', nameField, 'Введите имя'],
  ['the name has only spaces', '   ', 'ivan@example.com', nameField, 'Введите имя'],
  [
    'the name is longer than 100 characters',
    'я'.repeat(101),
    'ivan@example.com',
    nameField,
    'Имя длиннее 100 символов',
  ],
  ['the email is empty', 'Иван Петров', '', emailField, 'Введите email'],
  [
    'the email is longer than 254 characters',
    'Иван Петров',
    `${'a'.repeat(243)}@example.com`,
    emailField,
    'Email длиннее 254 символов',
  ],
  ['the email has no @', 'Иван Петров', 'ivan.example.com', emailField, 'Неверный email'],
])('the form is not sent when %s', async (_case, name, email, field, message) => {
  // No handler for createMeeting: a request would fail the test.
  await chooseSlot('09:00–09:30');

  if (name) await fill(nameField(), name);
  if (email) await fill(emailField(), email);
  await userEvent.click(within(form()).getByRole('button', { name: 'Записаться' }));

  expect(field()).toHaveAccessibleDescription(message);
});

test('a booked meeting replaces the days and slots with a confirmation', async () => {
  const sent: (NewMeeting & { meetingTypeId: string })[] = [];
  let respond!: () => void;
  const responded = new Promise<void>((resolve) => {
    respond = resolve;
  });
  server.use(
    handleCreateMeeting(async ({ params, request }) => {
      const body = await request.json();
      sent.push({ meetingTypeId: params.meetingTypeId, ...body });
      await responded;
      const meeting: Meeting = {
        id: 'e4b1c7a2-9d36-4f58-a0e3-5c2b8d1f7a94',
        meetingType,
        start: '2026-11-12T09:00:00+03:00',
        end: '2026-11-12T09:30:00+03:00',
        guestName: 'Иван Петров',
        guestEmail: 'Ivan@Example.com',
      };
      return HttpResponse.json(meeting, { status: 201 });
    }),
  );
  await chooseSlot('09:00–09:30');

  await fill(nameField(), '  Иван Петров ');
  await fill(emailField(), 'Ivan@Example.com');
  const submit = within(form()).getByRole('button', { name: 'Записаться' });
  await userEvent.click(submit);

  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({
    meetingTypeId: id,
    start: '2026-11-12T09:00:00+03:00',
    guestName: 'Иван Петров',
    guestEmail: 'Ivan@Example.com',
  });
  expect(submit).toBeDisabled();

  respond();

  const confirmation = await screen.findByRole('region', { name: 'Вы записаны' });
  expect(within(confirmation).getByText('Разбор резюме')).toBeInTheDocument();
  // 09:00 in Moscow is still 11 November in the browser's Los Angeles.
  expect(within(confirmation).getByText('четверг, 12 ноября, 09:00–09:30')).toBeInTheDocument();
  expect(within(confirmation).getByText('время московское (UTC+3)')).toBeInTheDocument();
  expect(within(confirmation).getByText('Иван Петров, Ivan@Example.com')).toBeInTheDocument();
  expect(within(confirmation).getByRole('link', { name: 'Записаться ещё' })).toHaveAttribute(
    'href',
    '/book',
  );
  expect(screen.queryByRole('region', { name: 'День' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Ваши данные' })).not.toBeInTheDocument();
  expect(within(summary()).getByText('четверг, 12 ноября')).toBeInTheDocument();
  expect(within(summary()).getByText('09:00–09:30')).toBeInTheDocument();
});

const rejectedBy = (error: ApiError) => () => HttpResponse.json(error, { status: 400 });

test.each([
  ['guestName', 'Проверьте имя', nameField],
  ['guestEmail', 'Неверный email', emailField],
])('a server rejection of %s shows «%s» under its field', async (field, message, getField) => {
  server.use(
    handleCreateMeeting(
      rejectedBy({ code: 'validation_error', message: `${field} is invalid`, field }),
    ),
  );
  await chooseSlot('09:30–10:00');

  await fill(nameField(), 'Иван Петров');
  await fill(emailField(), 'ivan@example.com');
  await userEvent.click(within(form()).getByRole('button', { name: 'Записаться' }));

  await waitFor(() => expect(getField()).toHaveAccessibleDescription(message));
  expect(nameField()).toHaveValue('Иван Петров');
  expect(emailField()).toHaveValue('ivan@example.com');
  expect(within(summary()).getByText('09:30–10:00')).toBeInTheDocument();
});

test('a meeting type that is gone by the time the form is sent is not found', async () => {
  server.use(handleCreateMeeting(() => HttpResponse.json(notFound, { status: 404 })));
  await chooseSlot('09:00–09:30');

  await fill(nameField(), 'Иван Петров');
  await fill(emailField(), 'ivan@example.com');
  await userEvent.click(within(form()).getByRole('button', { name: 'Записаться' }));

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Тип встречи не найден' }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('main')).getByRole('link', { name: 'К списку типов встреч' }),
  ).toHaveAttribute('href', '/book');
  expect(screen.queryByRole('region', { name: 'Встреча' })).not.toBeInTheDocument();
});

test.each([
  ['the network fails', () => HttpResponse.error()],
  ['the server fails', () => new HttpResponse(null, { status: 500 })],
  [
    'the server rejects the body as a whole',
    rejectedBy({ code: 'validation_error', message: 'Body is not valid JSON' }),
  ],
])(
  'the form keeps the slot, name and email and asks to try again when %s',
  async (_case, reply) => {
    server.use(handleCreateMeeting(reply));
    await chooseSlot('09:30–10:00');

    await fill(nameField(), 'Иван Петров');
    await fill(emailField(), 'ivan@example.com');
    await userEvent.click(within(form()).getByRole('button', { name: 'Записаться' }));

    expect(
      await within(form()).findByText('Не удалось записаться. Попробуйте ещё раз.'),
    ).toBeInTheDocument();
    expect(within(summary()).getByText('09:30–10:00')).toBeInTheDocument();
    expect(nameField()).toHaveValue('Иван Петров');
    expect(nameField()).not.toHaveAccessibleDescription();
    expect(emailField()).toHaveValue('ivan@example.com');
    expect(within(form()).getByRole('button', { name: 'Записаться' })).toBeEnabled();
  },
);
