import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectToDatabase } from './config/db';
import { sendTelegramMessage } from './services/telegram';

const portEnv = process.env.PORT;
const port = portEnv ? parseInt(portEnv, 10) : 3000;

async function bootstrap(): Promise<void> {
  await connectToDatabase();

  const app = createApp();

  const server = app.listen(port, async () => {
    // eslint-disable-next-line no-console
    console.log(`HTTP server listening on http://localhost:${port}`);
    try {
      await sendTelegramMessage({
        text: `newbotksenia: сервер запущен на порту ${port}`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Telegram notify on start failed', err);
    }
  });

  let isShuttingDown = false;

  const shutdown = async (signal: string, code: number) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down...`);
    try {
      await sendTelegramMessage({ text: `newbotksenia: остановка сервера (${signal})` });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Telegram notify on shutdown failed', err);
    }
    // Graceful shutdown with timeout
    const timeoutMs = 5000;
    const closePromise = new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await Promise.race([
      closePromise,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
    process.exit(code);
  };

  process.on('SIGINT', () => { void shutdown('SIGINT', 0); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM', 0); });

  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('uncaughtException', err);
    void sendTelegramMessage({ text: `newbotksenia: uncaughtException: ${err?.message || String(err)}` });
    void shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('unhandledRejection', reason);
    void sendTelegramMessage({ text: `newbotksenia: unhandledRejection: ${reason instanceof Error ? reason.message : String(reason)}` });
    void shutdown('unhandledRejection', 1);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start the server', error);
  process.exit(1);
});


