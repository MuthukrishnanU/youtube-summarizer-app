import { getCollection } from '../config/db';
import { generateEmbedding } from './gemini.service';
import { TranscriptChunk, VectorDocument } from '../types';

const COLLECTION_NAME = 'youtube_summarizer_vectordb';
const VECTOR_INDEX_NAME = 'vector_index';

/**
 * Store transcript chunks with their embeddings in MongoDB Atlas.
 * Deletes any existing chunks for the same videoId first (idempotent).
 */
export async function storeVideoChunks(
  videoId: string,
  chunks: TranscriptChunk[],
  title: string
): Promise<void> {
  const collection = getCollection(COLLECTION_NAME);

  // Remove any existing chunks for this video
  await collection.deleteMany({ videoId });

  if (chunks.length === 0) {
    console.warn('⚠️ No chunks to store for video', videoId);
    return;
  }

  console.log(`📦 Embedding and storing ${chunks.length} chunks for video ${videoId}...`);

  // Generate embeddings for all chunks (in batches to avoid rate limits)
  const documents: VectorDocument[] = [];
  const batchSize = 5;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map((chunk) => generateEmbedding(chunk.text))
    );

    for (let j = 0; j < batch.length; j++) {
      documents.push({
        videoId,
        text: batch[j].text,
        embedding: embeddings[j],
        startTime: batch[j].startTime,
        endTime: batch[j].endTime,
        createdAt: new Date(),
      });
    }

    console.log(`  ✅ Embedded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
  }

  // Store the title as a separate document for metadata retrieval
  const titleEmbedding = await generateEmbedding(`${title}`);
  documents.push({
    videoId,
    text: `Video Title: ${title}`,
    embedding: titleEmbedding,
    startTime: 0,
    endTime: 0,
    createdAt: new Date(),
  });

  await collection.insertMany(documents as any[]);
  console.log(`✅ Stored ${documents.length} documents in ${COLLECTION_NAME}`);
}

/**
 * Search for the most similar transcript chunks for a given question.
 * Uses MongoDB Atlas $vectorSearch aggregation stage.
 */
export async function searchSimilarChunks(
  videoId: string,
  question: string,
  limit: number = 5
): Promise<{ text: string; score: number; startTime: number; endTime: number }[]> {
  const collection = getCollection(COLLECTION_NAME);

  // Generate embedding for the question
  const queryEmbedding = await generateEmbedding(question);

  try {
      const results = await collection
        .aggregate([
          {
            $vectorSearch: {
              index: VECTOR_INDEX_NAME,
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: limit * 10,
              limit: limit,
              filter: { videoId: { $eq: videoId } },
            },
          },
        {
          $project: {
            _id: 0,
            text: 1,
            startTime: 1,
            endTime: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    return results as any[];
  } catch (error: any) {
    console.error('❌ Vector search failed:', error.message);
    // If vector search index doesn't exist yet, fallback to text match
    if (error.message.includes('index') || error.message.includes('vectorSearch')) {
      console.warn('⚠️ Vector search index may not be configured. Falling back to basic text search.');
      const fallbackResults = await collection
        .find({ videoId })
        .limit(limit)
        .project({ _id: 0, text: 1, startTime: 1, endTime: 1 })
        .toArray();

      return fallbackResults.map((doc: any) => ({ ...doc, score: 0 }));
    }
    throw error;
  }
}

/**
 * Get the stored video title from the vector collection.
 */
export async function getStoredVideoTitle(videoId: string): Promise<string> {
  const collection = getCollection(COLLECTION_NAME);
  const doc = await collection.findOne({
    videoId,
    text: { $regex: /^Video Title:/ },
  });

  if (doc) {
    return (doc as any).text.replace('Video Title: ', '');
  }
  return 'Unknown Video';
}
