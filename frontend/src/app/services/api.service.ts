import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SummaryTopic {
  topic: string;
  summary: string;
  startTime: string;
  endTime: string;
}

export interface VideoData {
  videoId: string;
  title: string;
  description: string;
  duration: string;
  summary: SummaryTopic[];
}

export interface ChatResponse {
  answer: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  /**
   * Summarize a YouTube video by its URL.
   */
  summarizeVideo(url: string): Observable<VideoData> {
    return this.http.post<VideoData>(`${this.baseUrl}/summarize`, { url });
  }

  /**
   * Ask a question about a summarized video.
   */
  askQuestion(videoId: string, question: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, {
      videoId,
      question,
    });
  }
}
