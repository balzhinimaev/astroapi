import mongoose from 'mongoose';

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  if (mongoose.connection.readyState === 1) {
    return; // already connected
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    dbName: "newbotksenia"
  });
  // eslint-disable-next-line no-console
  console.log('Connected to MongoDB');
}


