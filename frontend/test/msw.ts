import { setupServer } from 'msw/node';

/**
 * The API as the tests see it. A test declares the responses it needs with
 * `server.use(handleListMeetingTypes({ body: [...] }))`: the handler factories come from
 * `src/generated/msw.gen.ts` and are typed by the contract. Handlers are reset after each test,
 * and a request without a handler fails.
 */
export const server = setupServer();
