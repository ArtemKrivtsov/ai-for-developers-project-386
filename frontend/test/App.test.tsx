import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { handleListMeetingTypes } from '../src/generated/msw.gen.ts';
import { server } from './msw.ts';
import { renderAt } from './render.tsx';

test('home page shows the service name and the «Записаться» button', () => {
  renderAt('/');

  expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument();
  expect(
    within(screen.getByRole('main')).getByRole('link', { name: 'Записаться' }),
  ).toBeInTheDocument();
});

test('the «Записаться» button opens the meeting type catalog', async () => {
  server.use(handleListMeetingTypes({ body: [] }));
  renderAt('/');

  await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Записаться' }));

  expect(
    screen.getByRole('heading', { level: 1, name: 'Выберите тип встречи' }),
  ).toBeInTheDocument();
});

test('the header links to booking and to the owner pages', () => {
  renderAt('/');

  const header = screen.getByRole('banner');
  expect(within(header).getByRole('link', { name: 'Записаться' })).toHaveAttribute('href', '/book');
  const owner = within(header).getByRole('link', { name: 'Владельцу' });
  expect(owner).toHaveAttribute('href', '/owner');
  expect(owner).not.toHaveAttribute('aria-current');
});

test('the header highlights «Владельцу» on the owner pages', async () => {
  server.use(handleListMeetingTypes({ body: [] }));

  renderAt('/owner/types');

  expect(
    within(screen.getByRole('banner')).getByRole('link', { name: 'Владельцу' }),
  ).toHaveAttribute('aria-current', 'page');
  await screen.findByText('Типов встреч пока нет.');
});

test('an unknown address shows the not-found page with a link home', () => {
  renderAt('/no-such-page');

  expect(
    screen.getByRole('heading', { level: 1, name: 'Страница не найдена' }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('main')).getByRole('link', { name: 'На главную' }),
  ).toHaveAttribute('href', '/');
});
