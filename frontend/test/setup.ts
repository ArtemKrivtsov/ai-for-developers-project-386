import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import { client } from '../src/generated/client.gen.ts';
import { server } from './msw.ts';

// Node's Request does not resolve the SDK's relative URLs, the browser resolves them
// against the page address.
client.setConfig({ baseUrl: window.location.origin });

// An unhandled request errors, so the page would quietly show its load error.
// Failing the test instead points at the missing handler.
const unhandledRequests: string[] = [];
server.events.on('request:unhandled', ({ request }) => {
  unhandledRequests.push(`${request.method} ${new URL(request.url).pathname}`);
});

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  const requests = unhandledRequests.splice(0);
  expect(requests, 'requests without an MSW handler').toEqual([]);
});
afterAll(() => server.close());

// jsdom has no matchMedia, and MantineProvider reads the color scheme through it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
