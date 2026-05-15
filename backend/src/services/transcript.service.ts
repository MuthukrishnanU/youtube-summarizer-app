import { fetchTranscript } from 'youtube-transcript';
import YouTube from 'youtube-sr';
import { TranscriptSegment, VideoMetadata } from '../types';

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
 * Fetch the transcript for a YouTube video.
 * Returns an array of transcript segments with text, offset, and duration.
 */
export async function getTranscript(videoUrl: string): Promise<TranscriptSegment[]> {
  const videoId = extractVideoId(videoUrl);

  try {
    const transcript = await fetchTranscript(videoId);

    return transcript.map((item: any) => ({
      text: item.text || '',
      offset: item.offset || 0,
      duration: item.duration || 0,
    }));
  } catch (error: any) {
    throw new Error(
      `Failed to fetch transcript for video ${videoId}. ` +
      `Ensure the video has captions enabled. Error: ${error.message}`
    );
  }
}

/**
 * Fetch video metadata (title, description, duration) using youtube-sr.
 * Returns "NA" for any field that cannot be retrieved.
 */
export async function getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  const videoId = extractVideoId(videoUrl);

  try {
    const video = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`);

    if (!video) {
      return {
        title: 'NA',
        description: 'NA',
        durationFormatted: 'NA',
        durationSeconds: 0,
        videoId,
      };
    }

    return {
      title: video.title || 'NA',
      description: video.description || 'NA',
      durationFormatted: video.durationFormatted || 'NA',
      durationSeconds: video.duration ? video.duration / 1000 : 0,
      videoId,
    };
  } catch (error: any) {
    console.warn(`⚠️ Could not fetch metadata for video ${videoId}:`, error.message);
    return {
      title: 'NA',
      description: 'NA',
      durationFormatted: 'NA',
      durationSeconds: 0,
      videoId,
    };
  }
}
