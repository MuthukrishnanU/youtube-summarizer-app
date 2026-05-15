import { GoogleGenAI } from '@google/genai';
import { SummaryTopic } from '../types';

let ai: GoogleGenAI;

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// ----- Constants -----
const GENERATION_MODEL = 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * Generate a topic-wise summary of the video transcript using Gemini.
 * Returns an array of topics with summaries and timestamp ranges.
 */
export async function generateSummary(
  transcriptText: string,
  title: string,
  description: string
): Promise<SummaryTopic[]> {
  const client = getAI();

  const prompt = `You are an expert video content analyst. Analyze the following YouTube video transcript and produce a structured summary organized by key topics and important moments.

**Video Title:** ${title}
**Video Description:** ${description}

**Transcript:**
${transcriptText}

**Instructions:**
1. Identify the major topics, themes, and key moments discussed in the video.
2. For each topic, provide:
   - A concise topic title
   - A clear summary (2-4 sentences)
   - The approximate start timestamp (from the transcript timestamps)
   - The approximate end timestamp
3. Order topics chronologically as they appear in the video.
4. Aim for 4-8 topics depending on video length.
5. Timestamps should be in MM:SS or HH:MM:SS format.

**You MUST respond with ONLY a valid JSON array** in this exact format, no markdown, no code fences:
[
  {
    "topic": "Topic Title",
    "summary": "Clear summary of this topic...",
    "startTime": "00:00",
    "endTime": "02:30"
  }
]`;

  try {
    const response = await client.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });

    const text = response.text?.trim() || '[]';

    // Clean up the response - remove any markdown code fences if present
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const topics: SummaryTopic[] = JSON.parse(cleaned);
    return topics;
  } catch (error: any) {
    console.error('❌ Gemini summary generation failed:', error.message);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

/**
 * Generate a text embedding vector using Gemini's embedding model.
 * Returns a 768-dimensional float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getAI();

  try {
    const result = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    if (!result.embeddings?.[0]?.values) {
      throw new Error('No embedding values returned');
    }

    return result.embeddings[0].values;
  } catch (error: any) {
    console.error('❌ Embedding generation failed:', error.message);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate a chat response using Gemini with retrieved context chunks.
 * The response is constrained to the video content only.
 */
export async function generateChatResponse(
  question: string,
  contextChunks: string[],
  videoTitle: string
): Promise<string> {
  const client = getAI();

  const context = contextChunks.join('\n\n---\n\n');

  const prompt = `You are a helpful assistant that answers questions about a specific YouTube video titled "${videoTitle}".

**Important Rules:**
1. ONLY answer questions related to the video content provided in the context below.
2. If the question is NOT related to the video, politely decline and explain that you can only answer questions about this specific video.
3. Be concise but thorough in your answers.
4. Reference specific parts of the video when relevant.
5. If the context doesn't contain enough information to answer the question, say so honestly.

**Video Context (relevant transcript excerpts):**
${context}

**User Question:** ${question}

**Your Answer:**`;

  try {
    const response = await client.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || 'I was unable to generate a response. Please try again.';
  } catch (error: any) {
    console.error('❌ Chat response generation failed:', error.message);
    throw new Error(`Failed to generate chat response: ${error.message}`);
  }
}
