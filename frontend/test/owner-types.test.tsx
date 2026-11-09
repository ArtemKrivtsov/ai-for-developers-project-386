import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import type { ApiError, MeetingType, NewMeetingType } from '../src/generated/index.ts';
import { handleCreateMeetingType, handleListMeetingTypes } from '../src/generated/msw.gen.ts';
import { server } from './msw.ts';
import { renderAt } from './render.tsx';

test('owner pages show a panel with the current page highlighted', async () => {
  server.use(handleListMeetingTypes({ body: [] }));

  renderAt('/owner/types');

  const panel = screen.getByRole('navigation', { name: 'Владелец' });
  expect(within(panel).getByText('Владелец')).toBeInTheDocument();
  const link = within(panel).getByRole('link', { name: 'Типы встреч' });
  expect(link).toHaveAttribute('href', '/owner/types');
  expect(link).toHaveAttribute('aria-current', 'page');
  await screen.findByText('Типов встреч пока нет.');
});

test('the owner sees meeting types as cards with a link for guests', async () => {
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
          description: '',
          durationMinutes: 90,
        },
      ],
    }),
  );

  renderAt('/owner/types');

  expect(screen.getByRole('heading', { level: 1, name: 'Типы встреч' })).toBeInTheDocument();
  const cards = await screen.findAllByRole('article');
  expect(cards).toHaveLength(2);

  expect(within(cards[0]).getByRole('heading', { name: 'Разбор резюме' })).toBeInTheDocument();
  expect(within(cards[0]).getByText('30 мин')).toBeInTheDocument();
  expect(
    within(cards[0]).getByText('Пройдёмся по резюме и сопроводительному письму.'),
  ).toBeInTheDocument();
  expect(cards[0]).toHaveTextContent(
    'Ссылка для гостей: /book/7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10',
  );
  expect(
    within(cards[0]).getByRole('link', { name: '/book/7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10' }),
  ).toHaveAttribute('href', '/book/7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10');

  expect(
    within(cards[1]).getByRole('heading', { name: 'Сессия по архитектуре' }),
  ).toBeInTheDocument();
  expect(within(cards[1]).getByText('1 ч 30 мин')).toBeInTheDocument();
  expect(
    within(cards[1]).getByRole('link', { name: '/book/c1e9b0d2-5a37-4f6e-8b24-9e0d7a3f5c61' }),
  ).toHaveAttribute('href', '/book/c1e9b0d2-5a37-4f6e-8b24-9e0d7a3f5c61');
});

test('the owner sees a loading indicator until the meeting types arrive', async () => {
  server.use(handleListMeetingTypes({ body: [] }));

  renderAt('/owner/types');

  expect(screen.getByRole('status', { name: 'Загрузка' })).toBeInTheDocument();
  await screen.findByText('Типов встреч пока нет.');
  expect(screen.queryByRole('status', { name: 'Загрузка' })).not.toBeInTheDocument();
});

test.each([
  ['the server fails', () => new HttpResponse(null, { status: 500 })],
  ['the network fails', () => HttpResponse.error()],
])('the owner is asked to reload the page when %s', async (_case, resolver) => {
  server.use(handleListMeetingTypes(resolver));

  renderAt('/owner/types');

  expect(
    await screen.findByText('Не удалось загрузить типы встреч. Обновите страницу.'),
  ).toBeInTheDocument();
});

/** Opens the «Новый тип встречи» window on a page with no meeting types. */
async function openNewMeetingTypeWindow() {
  server.use(handleListMeetingTypes({ body: [] }));
  renderAt('/owner/types');
  await screen.findByText('Типов встреч пока нет.');
  await userEvent.click(screen.getByRole('button', { name: 'Создать' }));
  return screen.getByRole('dialog', { name: 'Новый тип встречи' });
}

const nameField = (dialog: HTMLElement) =>
  within(dialog).getByRole('textbox', { name: 'Название' });
const descriptionField = (dialog: HTMLElement) =>
  within(dialog).getByRole('textbox', { name: 'Описание' });
const durationField = (dialog: HTMLElement) =>
  within(dialog).getByRole('combobox', { name: 'Длительность' });

async function fill(field: HTMLElement, text: string) {
  await userEvent.clear(field);
  await userEvent.click(field);
  await userEvent.paste(text);
}

async function chooseDuration(dialog: HTMLElement, label: string) {
  await userEvent.click(durationField(dialog));
  await userEvent.click(within(dialog).getByRole('option', { name: label }));
}

test('«Создать» opens a form for a new meeting type of 30 minutes', async () => {
  const dialog = await openNewMeetingTypeWindow();

  expect(nameField(dialog)).toHaveValue('');
  expect(nameField(dialog)).toBeRequired();
  expect(descriptionField(dialog)).toHaveValue('');
  expect(durationField(dialog)).toHaveValue('30 мин');

  await userEvent.click(durationField(dialog));
  expect(
    within(dialog)
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['15 мин', '30 мин', '45 мин', '1 ч', '1 ч 30 мин', '2 ч']);
  expect(within(dialog).getByRole('button', { name: 'Создать' })).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
});

test.each([
  ['the name is empty', async () => {}, nameField, 'Введите название'],
  [
    'the name has only spaces',
    (dialog: HTMLElement) => fill(nameField(dialog), '   '),
    nameField,
    'Введите название',
  ],
  [
    'the name is longer than 100 characters',
    (dialog: HTMLElement) => fill(nameField(dialog), 'я'.repeat(101)),
    nameField,
    'Название длиннее 100 символов',
  ],
  [
    'the description is longer than 500 characters',
    (dialog: HTMLElement) => fill(descriptionField(dialog), 'я'.repeat(501)),
    descriptionField,
    'Описание длиннее 500 символов',
  ],
  [
    'no duration is chosen',
    // Choosing the selected option again clears the choice.
    (dialog: HTMLElement) => chooseDuration(dialog, '30 мин'),
    durationField,
    'Выберите длительность',
  ],
])('the form is not sent when %s', async (_case, change, field, message) => {
  // No handler for createMeetingType: a request would fail the test.
  const dialog = await openNewMeetingTypeWindow();

  await change(dialog);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

  expect(field(dialog)).toHaveAccessibleDescription(message);
});

const rejectedBy = (error: ApiError) => () => HttpResponse.json(error, { status: 400 });

test.each([
  ['name', 'Проверьте название', nameField],
  ['description', 'Проверьте описание', descriptionField],
  ['durationMinutes', 'Выберите длительность', durationField],
])('a server rejection of %s shows «%s» under the field', async (field, message, getField) => {
  server.use(
    handleCreateMeetingType(
      rejectedBy({ code: 'validation_error', message: `${field} is invalid`, field }),
    ),
  );
  const dialog = await openNewMeetingTypeWindow();

  await fill(nameField(dialog), 'Созвон');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

  await waitFor(() => expect(getField(dialog)).toHaveAccessibleDescription(message));
  expect(nameField(dialog)).toHaveValue('Созвон');
});

test.each([
  ['the network fails', () => HttpResponse.error()],
  ['the server fails', () => new HttpResponse(null, { status: 500 })],
  [
    'the server rejects the body as a whole',
    rejectedBy({ code: 'validation_error', message: 'Body is not valid JSON' }),
  ],
])('the form keeps its data and asks to try again when %s', async (_case, resolver) => {
  server.use(handleCreateMeetingType(resolver));
  const dialog = await openNewMeetingTypeWindow();

  await fill(nameField(dialog), 'Созвон');
  await fill(descriptionField(dialog), 'Короткий звонок.');
  await chooseDuration(dialog, '45 мин');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

  expect(
    await within(dialog).findByText('Не удалось создать тип встречи. Попробуйте ещё раз.'),
  ).toBeInTheDocument();
  expect(nameField(dialog)).toHaveValue('Созвон');
  expect(descriptionField(dialog)).toHaveValue('Короткий звонок.');
  expect(durationField(dialog)).toHaveValue('45 мин');
  expect(within(dialog).getByRole('button', { name: 'Создать' })).toBeEnabled();
});

test.each([
  ['«Отмена»', (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Отмена' })],
  [
    'the close button',
    (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Закрыть' }),
  ],
])('closing the window with %s discards what was entered', async (_case, closeButton) => {
  const dialog = await openNewMeetingTypeWindow();
  await fill(nameField(dialog), '   ');
  await fill(descriptionField(dialog), 'Короткий звонок.');
  await chooseDuration(dialog, '2 ч');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));
  expect(nameField(dialog)).toHaveAccessibleDescription('Введите название');

  await userEvent.click(closeButton(dialog));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Создать' }));

  const reopened = screen.getByRole('dialog', { name: 'Новый тип встречи' });
  expect(nameField(reopened)).toHaveValue('');
  expect(nameField(reopened)).not.toHaveAccessibleDescription();
  expect(descriptionField(reopened)).toHaveValue('');
  expect(durationField(reopened)).toHaveValue('30 мин');
});

test('a created meeting type closes the window and appears at the end of the list', async () => {
  const meetingTypes: MeetingType[] = [
    {
      id: '7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10',
      name: 'Знакомство',
      description: '',
      durationMinutes: 30,
    },
  ];
  const sent: NewMeetingType[] = [];
  let respond!: () => void;
  const responded = new Promise<void>((resolve) => {
    respond = resolve;
  });
  server.use(
    handleListMeetingTypes(() => HttpResponse.json(meetingTypes)),
    handleCreateMeetingType(async ({ request }) => {
      const body = await request.json();
      sent.push(body);
      await responded;
      const created: MeetingType = {
        id: 'c1e9b0d2-5a37-4f6e-8b24-9e0d7a3f5c61',
        description: '',
        ...body,
      };
      meetingTypes.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  );
  renderAt('/owner/types');
  await screen.findByRole('heading', { name: 'Знакомство' });

  await userEvent.click(screen.getByRole('button', { name: 'Создать' }));
  const dialog = screen.getByRole('dialog', { name: 'Новый тип встречи' });
  await fill(nameField(dialog), '  Разбор резюме ');
  await fill(descriptionField(dialog), ' Пройдёмся по резюме.\n');
  await chooseDuration(dialog, '1 ч');
  const submit = within(dialog).getByRole('button', { name: 'Создать' });
  await userEvent.click(submit);

  await waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0]).toEqual({
    name: 'Разбор резюме',
    description: 'Пройдёмся по резюме.',
    durationMinutes: 60,
  });
  expect(submit).toBeDisabled();

  respond();

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
  const cards = screen.getAllByRole('article');
  expect(within(cards[1]).getByRole('heading', { name: 'Разбор резюме' })).toBeInTheDocument();
  expect(within(cards[1]).getByText('1 ч')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Создать' }));
  const reopened = screen.getByRole('dialog', { name: 'Новый тип встречи' });
  expect(nameField(reopened)).toHaveValue('');
  expect(descriptionField(reopened)).toHaveValue('');
  expect(durationField(reopened)).toHaveValue('30 мин');
});
