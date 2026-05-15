import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-url-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './url-input.component.html',
  styleUrl: './url-input.component.css',
})
export class UrlInputComponent {
  /** Emits the YouTube URL when the user clicks Summarize */
  summarizeRequested = output<string>();

  url = signal('');
  isLoading = signal(false);

  private youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}/;

  get isValidUrl(): boolean {
    return this.youtubeRegex.test(this.url());
  }

  onSubmit(): void {
    if (this.isValidUrl && !this.isLoading()) {
      this.summarizeRequested.emit(this.url());
    }
  }

  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }
}
