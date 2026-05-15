/**
 * Transcript segment as returned by youtube-transcript package.
 */
export interface TranscriptSegment {
  text: string;
  offset: number;   // Start time in ms
  duration: number;  // Duration in ms
}

/**
 * Video metadata from youtube-sr.
 */
export interface VideoMetadata {
  title: string;
  description: string;
  durationFormatted: string;
  durationSeconds: number;
  videoId: string;
}

/**
 * A chunk of transcript text with timestamp information.
 */
export interface TranscriptChunk {
  text: string;
  startTime: number;  // Seconds
  endTime: number;    // Seconds
}

/**
 * Summary topic returned by Gemini.
 */
export interface SummaryTopic {
  topic: string;
  summary: string;
  startTime: string;  // Formatted timestamp like "02:15"
  endTime: string;    // Formatted timestamp like "05:30"
}

/**
 * Complete summarize response sent to the frontend.
 */
export interface SummarizeResponse {
  videoId: string;
  title: string;
  description: string;
  duration: string;
  summary: SummaryTopic[];
}

/**
 * Chat request from the frontend.
 */
export interface ChatRequest {
  videoId: string;
  question: string;
}

/**
 * Chat response sent to the frontend.
 */
export interface ChatResponse {
  answer: string;
}

/**
 * Document stored in MongoDB vector collection.
 */
export interface VectorDocument {
  videoId: string;
  text: string;
  embedding: number[];
  startTime: number;
  endTime: number;
  createdAt: Date;
}
