import { Component, input, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements AfterViewChecked {
  /** The video ID — empty means chat is disabled */
  videoId = input<string>('');

  /** The video title for display */
  videoTitle = input<string>('');

  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isTyping = signal(false);

  @ViewChild('chatMessages') chatMessagesEl!: ElementRef;

  private shouldScroll = false;

  constructor(private apiService: ApiService) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  get isEnabled(): boolean {
    return !!this.videoId();
  }

  sendMessage(): void {
    const text = this.currentMessage().trim();
    if (!text || this.isTyping() || !this.isEnabled) return;

    // Add user message
    this.messages.update((msgs) => [
      ...msgs,
      { role: 'user', text, timestamp: new Date() },
    ]);
    this.currentMessage.set('');
    this.isTyping.set(true);
    this.shouldScroll = true;

    // Call backend
    this.apiService.askQuestion(this.videoId(), text).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'ai', text: res.answer, timestamp: new Date() },
        ]);
        this.isTyping.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'ai',
            text: 'Sorry, I encountered an error. Please try again.',
            timestamp: new Date(),
          },
        ]);
        this.isTyping.set(false);
        this.shouldScroll = true;
        console.error('Chat error:', err);
      },
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.chatMessagesEl?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) {}
  }
}
