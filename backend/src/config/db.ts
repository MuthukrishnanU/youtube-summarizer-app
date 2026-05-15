import { MongoClient, Db, Collection, Document } from 'mongodb';

let client: MongoClient;
let db: Db;

/**
 * Connect to MongoDB Atlas using the connection string from environment variables.
 */
export async function connectToDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGODB_DB_NAME || 'youtube_summarizer';
  db = client.db(dbName);

  // Ping to verify connection
  await db.command({ ping: 1 });
}

/**
 * Get the database instance.
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

/**
 * Get a specific collection from the database.
 */
export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

/**
 * Close the database connection gracefully.
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
}
