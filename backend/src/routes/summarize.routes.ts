import { Router, Request, Response } from 'express';
import { getTranscript, getVideoMetadata, extractVideoId } from '../services/transcript.service';
import { generateSummary } from '../services/gemini.service';
import { storeVideoChunks } from '../services/vector.service';
import { chunkTranscript, combineTranscriptText } from '../utils/chunker';
import { SummarizeResponse } from '../types';

const router = Router();

/**
 * POST /api/summarize
 * Body: { url: string }
 *
 * Fetches video transcript + metadata, generates a topic-wise summary,
 * stores transcript chunks with embeddings in MongoDB, and returns the result.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: 'YouTube URL is required' });
    return;
  }

  try {
    // 1. Extract video ID
    const videoId = extractVideoId(url);
    console.log(`\n🎬 Processing video: ${videoId}`);

    // 2. Fetch transcript and metadata in parallel
    const [transcript, metadata] = await Promise.all([
      getTranscript(url),
      getVideoMetadata(url),
    ]);

    console.log(`📝 Fetched ${transcript.length} transcript segments`);
    console.log(`📋 Video: "${metadata.title}" (${metadata.durationFormatted})`);

    // 3. Combine transcript into full text with timestamps
    const fullTranscriptText = combineTranscriptText(transcript);

    // 4. Generate summary using Gemini
    console.log('🤖 Generating summary with Gemini...');
    const summary = await generateSummary(
      fullTranscriptText,
      metadata.title,
      metadata.description
    );
    console.log(`✅ Generated ${summary.length} topic summaries`);

    // 5. Chunk transcript for vector storage
    const chunks = chunkTranscript(transcript);
    console.log(`📦 Created ${chunks.length} transcript chunks`);

    // 6. Store chunks with embeddings in MongoDB (await so chat works immediately)
    try {
      await storeVideoChunks(videoId, chunks, metadata.title);
      console.log('✅ Vector storage complete');
    } catch (storageErr: any) {
      console.error('⚠️ Vector storage failed (chat may not work):', storageErr.message);
      // Don't fail the whole request — summary is still valid
    }

    // 7. Return the summarized response
    const response: SummarizeResponse = {
      videoId,
      title: metadata.title,
      description: metadata.description,
      duration: metadata.durationFormatted,
      summary,
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ Summarize error:', error.message);
    res.status(500).json({
      error: 'Failed to summarize video',
      details: error.message,
    });
  }
});

export default router;
