import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import App from '../src/App.tsx';
import { theme } from '../src/theme.ts';

/** Renders the whole app as if the browser opened `path`. */
export function renderAt(path: string) {
  render(
    <MantineProvider theme={theme} env="test">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
}
