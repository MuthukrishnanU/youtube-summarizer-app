import dns from 'node:dns';

// Force Node.js to use Google's public DNS to avoid SRV resolution issues on some networks/Node versions
dns.setServers(['8.8.8.8']);

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

// Ensure database connection before handling any API requests
app.use('/api', async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('DB Connection Error in middleware:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

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
  // In serverless (Vercel), the database connection is handled by the middleware
  // on every request to /api/*
}
