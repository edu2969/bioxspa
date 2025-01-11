import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

async function connectMongoDB() {
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  // Forzar una nueva conexión cada vez
  const connection = await mongoose.connect(MONGODB_URI, opts);
  return connection;
}

export { connectMongoDB };