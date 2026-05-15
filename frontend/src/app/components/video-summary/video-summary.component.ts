import { Component, input } from '@angular/core';
import { VideoData } from '../../services/api.service';

@Component({
  selector: 'app-video-summary',
  standalone: true,
  imports: [],
  templateUrl: './video-summary.component.html',
  styleUrl: './video-summary.component.css',
})
export class VideoSummaryComponent {
  /** The video data including metadata and summary topics */
  videoData = input.required<VideoData>();

  /**
   * Truncate description to a reasonable preview length.
   */
  get truncatedDescription(): string {
    const desc = this.videoData().description;
    if (!desc || desc === 'NA') return 'NA';
    return desc.length > 300 ? desc.substring(0, 300) + '…' : desc;
  }
}
