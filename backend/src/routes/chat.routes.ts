import { Router, Request, Response } from 'express';
import { searchSimilarChunks, getStoredVideoTitle } from '../services/vector.service';
import { generateChatResponse } from '../services/gemini.service';
import { ChatRequest } from '../types';

const router = Router();

/**
 * POST /api/chat
 * Body: { videoId: string, question: string }
 *
 * Performs vector search on stored transcript chunks, retrieves relevant context,
 * and generates a contextual answer using Gemini.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { videoId, question } = req.body as ChatRequest;

  if (!videoId || !question) {
    res.status(400).json({ error: 'Both videoId and question are required' });
    return;
  }

  try {
    console.log(`\n💬 Chat question for video ${videoId}: "${question}"`);

    // 1. Search for relevant transcript chunks
    const relevantChunks = await searchSimilarChunks(videoId, question, 5);

    if (relevantChunks.length === 0) {
      res.json({
        answer: 'I don\'t have any context about this video yet. Please make sure the video has been summarized first.',
      });
      return;
    }

    console.log(`🔍 Found ${relevantChunks.length} relevant chunks`);

    // 2. Extract text from chunks for context
    const contextTexts = relevantChunks.map((chunk) => chunk.text);

    // 3. Get the video title for context
    const videoTitle = await getStoredVideoTitle(videoId);

    // 4. Generate response using Gemini
    const answer = await generateChatResponse(question, contextTexts, videoTitle);

    console.log('✅ Chat response generated');

    res.json({ answer });
  } catch (error: any) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({
      error: 'Failed to generate chat response',
      details: error.message,
    });
  }
});

export default router;
