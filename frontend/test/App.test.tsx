import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';

import App from '../src/App.tsx';
import { theme } from '../src/theme.ts';

function renderAt(path: string) {
  render(
    <MantineProvider theme={theme} env="test">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}

test('home page shows the service name and the «Записаться» button', () => {
  renderAt('/');

  expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeInTheDocument();
  expect(
    within(screen.getByRole('main')).getByRole('link', { name: 'Записаться' }),
  ).toBeInTheDocument();
});

test('the «Записаться» button opens the meeting type catalog', async () => {
  renderAt('/');

  await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Записаться' }));

  expect(
    screen.getByRole('heading', { level: 1, name: 'Выберите тип встречи' }),
  ).toBeInTheDocument();
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
