import YouTube from 'youtube-sr';
import { GoogleGenAI } from '@google/genai';
import { TranscriptSegment, VideoMetadata } from '../types';

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

const GENERATION_MODEL = 'gemini-2.5-flash';

/**
 * Extract the video ID from various YouTube URL formats.
 */
export function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // If the input is already a video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  throw new Error(`Invalid YouTube URL or video ID: ${url}`);
}

/**
 * Fetch the transcript for a YouTube video using Gemini's native YouTube support.
 * This bypasses YouTube's IP blocking on cloud providers by using Google's own API
 * to process the video directly.
 */
export async function getTranscript(videoUrl: string): Promise<TranscriptSegment[]> {
  const videoId = extractVideoId(videoUrl);
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    console.log(`🔍 Fetching transcript via Gemini for video: ${videoId}...`);
    const client = getAI();

    const prompt = `Extract the full spoken transcript of this YouTube video with timestamps.
Return a JSON array. Each element has: "text" (string, one sentence, no newlines), "offset" (number, start ms), "duration" (number, ms).
Group speech into segments of roughly 5 seconds each. Use actual video timestamps converted to milliseconds.
Return ONLY the raw JSON array. No markdown, no code fences, no explanation.`;

    const response = await client.models.generateContent({
      model: GENERATION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: youtubeUrl,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const rawText = response.text?.trim() || '[]';

    // Clean up the response - remove any markdown code fences if present
    let cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Extract only the JSON array portion (between first [ and last ])
    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
    }

    // Sanitize: fix unescaped newlines/tabs inside JSON string values
    // Replace literal newlines and tabs that appear inside strings with a space
    cleaned = cleaned.replace(/(?<=:\s*"[^"]*)\n/g, ' ');
    cleaned = cleaned.replace(/\r\n/g, ' ');
    cleaned = cleaned.replace(/\r/g, ' ');
    cleaned = cleaned.replace(/\t/g, ' ');

    // More aggressive fallback: replace all newlines between quotes
    // by processing line by line and reconstructing valid JSON
    let segments: TranscriptSegment[];
    try {
      segments = JSON.parse(cleaned);
    } catch {
      // Fallback: strip all control characters inside string values
      const sanitized = cleaned.replace(
        /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
        (_match, content) => {
          const safe = content
            .replace(/[\n\r\t]/g, ' ')
            .replace(/\s{2,}/g, ' ');
          return `"text": "${safe}"`;
        }
      );
      segments = JSON.parse(sanitized);
    }

    if (!segments || segments.length === 0) {
      throw new Error('No transcript data returned from Gemini.');
    }

    console.log(`📝 Extracted ${segments.length} transcript segments via Gemini`);
    return segments;
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    console.error(`❌ Gemini transcript extraction failed for ${videoId}:`, errorMsg);

    throw new Error(
      `Failed to extract transcript for video ${videoId}. (Error: ${errorMsg})`
    );
  }
}

/**
 * Fetch video metadata (title, description, duration) using youtube-sr.
 * Falls back to Gemini if youtube-sr fails (cloud provider IP block).
 */
export async function getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  const videoId = extractVideoId(videoUrl);

  // Try youtube-sr first
  try {
    const video = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`);

    if (video) {
      return {
        title: video.title || 'NA',
        description: video.description || 'NA',
        durationFormatted: video.durationFormatted || 'NA',
        durationSeconds: video.duration ? video.duration / 1000 : 0,
        videoId,
      };
    }
  } catch (error: any) {
    console.warn(`⚠️ youtube-sr failed for ${videoId}: ${error.message}. Falling back to Gemini...`);
  }

  // Fallback: Use Gemini to extract metadata
  try {
    const client = getAI();
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const response = await client.models.generateContent({
      model: GENERATION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: youtubeUrl,
              },
            },
            {
              text: `What is the title, description, and duration of this YouTube video?
Return ONLY a valid JSON object in this exact format, no markdown or code fences:
{"title": "Video Title", "description": "Brief description", "durationFormatted": "MM:SS", "durationSeconds": 123}`,
            },
          ],
        },
      ],
    });

    const text = response.text?.trim() || '{}';
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const meta = JSON.parse(cleaned);

    return {
      title: meta.title || 'NA',
      description: meta.description || 'NA',
      durationFormatted: meta.durationFormatted || 'NA',
      durationSeconds: meta.durationSeconds || 0,
      videoId,
    };
  } catch (geminiError: any) {
    console.warn(`⚠️ Gemini metadata fallback also failed for ${videoId}:`, geminiError.message);
    return {
      title: 'NA',
      description: 'NA',
      durationFormatted: 'NA',
      durationSeconds: 0,
      videoId,
    };
  }
}
