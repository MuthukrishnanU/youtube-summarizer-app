import { Component, signal, ViewChild } from '@angular/core';
import { UrlInputComponent } from './components/url-input/url-input.component';
import { VideoSummaryComponent } from './components/video-summary/video-summary.component';
import { ChatComponent } from './components/chat/chat.component';
import { ApiService, VideoData } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UrlInputComponent, VideoSummaryComponent, ChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  /** Holds the summarized video data */
  videoData = signal<VideoData | null>(null);

  /** Loading state */
  isLoading = signal(false);

  /** Error message */
  errorMessage = signal('');

  @ViewChild(UrlInputComponent) urlInput!: UrlInputComponent;

  constructor(private apiService: ApiService) {}

  /**
   * Called when the user submits a URL for summarization.
   */
  onSummarize(url: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.videoData.set(null);
    this.urlInput.setLoading(true);

    this.apiService.summarizeVideo(url).subscribe({
      next: (data) => {
        this.videoData.set(data);
        this.isLoading.set(false);
        this.urlInput.setLoading(false);
      },
      error: (err) => {
        console.error('Summarize error:', err);
        const message =
          err.error?.details ||
          err.error?.error ||
          'Failed to summarize video. Please check the URL and try again.';
        this.errorMessage.set(message);
        this.isLoading.set(false);
        this.urlInput.setLoading(false);
      },
    });
  }
}
