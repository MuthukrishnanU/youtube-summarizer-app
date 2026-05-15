import { TranscriptSegment, TranscriptChunk } from '../types';

/**
 * Chunk transcript segments into larger pieces suitable for embedding.
 * Each chunk is approximately `maxTokens` words long with overlap for context continuity.
 *
 * @param segments - Raw transcript segments from youtube-transcript
 * @param maxWords - Maximum words per chunk (approximation)
 * @param overlapWords - Number of overlapping words between chunks
 * @returns Array of transcript chunks with start/end timestamps
 */
export function chunkTranscript(
  segments: TranscriptSegment[],
  maxWords: number = 300,
  overlapWords: number = 50
): TranscriptChunk[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const chunks: TranscriptChunk[] = [];
  let currentWords: string[] = [];
  let chunkStartTime = segments[0].offset / 1000; // Convert ms to seconds
  let chunkEndTime = 0;

  for (const segment of segments) {
    const segmentWords = segment.text.trim().split(/\s+/);
    const segmentEndTime = (segment.offset + segment.duration) / 1000;

    currentWords.push(...segmentWords);
    chunkEndTime = segmentEndTime;

    if (currentWords.length >= maxWords) {
      // Save the current chunk
      chunks.push({
        text: currentWords.join(' '),
        startTime: Math.floor(chunkStartTime),
        endTime: Math.ceil(chunkEndTime),
      });

      // Keep overlap words for context continuity
      const overlapStart = Math.max(0, currentWords.length - overlapWords);
      currentWords = currentWords.slice(overlapStart);
      chunkStartTime = Math.max(0, chunkEndTime - 10); // Approximate overlap timestamp
    }
  }

  // Don't forget the last chunk
  if (currentWords.length > 0) {
    chunks.push({
      text: currentWords.join(' '),
      startTime: Math.floor(chunkStartTime),
      endTime: Math.ceil(chunkEndTime),
    });
  }

  return chunks;
}

/**
 * Convert seconds to a formatted timestamp string (MM:SS or HH:MM:SS).
 */
export function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Combine all transcript segments into a single text string with timestamps.
 */
export function combineTranscriptText(segments: TranscriptSegment[]): string {
  return segments
    .map((seg) => {
      const timestamp = formatTimestamp(seg.offset / 1000);
      return `[${timestamp}] ${seg.text.trim()}`;
    })
    .join('\n');
}
