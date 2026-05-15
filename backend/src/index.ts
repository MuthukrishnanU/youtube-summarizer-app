import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/db';
import summarizeRoutes from './routes/summarize.routes';
import chatRoutes from './routes/chat.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/summarize', summarizeRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export app for Vercel
export default app;

// Start server only if running directly (local development)
if (require.main === module) {
  const startServer = async () => {
    try {
      await connectToDatabase();
      console.log('✅ Connected to MongoDB Atlas');

      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
} else {
  // In serverless (Vercel), we connect to the database on the first request
  // or use a middleware to ensure connection.
  connectToDatabase().catch(err => console.error('DB Connection Error:', err));
}
