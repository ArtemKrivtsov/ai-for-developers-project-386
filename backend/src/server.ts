import { buildApp } from './app.ts';

const app = buildApp({ serveFrontend: true });
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';

// In a container the server is PID 1, and only a handler makes it exit on a signal.
// A repeated signal falls back to the default handling and kills the process at once.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'closing the server');
    app.close().catch((err: unknown) => {
      app.log.error(err);
      process.exit(1);
    });
  });
}

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
