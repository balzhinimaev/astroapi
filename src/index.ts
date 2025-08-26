import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectToDatabase } from './config/db';

const portEnv = process.env.PORT;
const port = portEnv ? parseInt(portEnv, 10) : 3000;

async function bootstrap(): Promise<void> {
  await connectToDatabase();

  const app = createApp();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`HTTP server listening on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start the server', error);
  process.exit(1);
});


