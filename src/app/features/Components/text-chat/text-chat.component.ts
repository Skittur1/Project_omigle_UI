import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockSignalRService } from '../../../core/services/signal-r.service';
import { Subscription } from 'rxjs';

interface Message {
  userName: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

@Component({
  selector: 'app-text-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="text-chat-container min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div class="max-w-4xl mx-auto px-4 py-8">
        <!-- Header -->
        <div class="bg-gray-800/50 backdrop-blur-md rounded-t-2xl p-4 border-b border-gray-700">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-bold text-white">Text Chat</h2>
              <p class="text-sm text-gray-400">Chat with strangers anonymously</p>
            </div>
            <button 
              (click)="endChat()"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition">
              End Chat
            </button>
          </div>
        </div>

        <!-- Join Screen -->
        @if (!isInChat && !isConnecting) {
          <div class="bg-gray-800/50 backdrop-blur-md rounded-b-2xl p-8">
            <div class="max-w-md mx-auto">
              <h3 class="text-2xl font-bold text-white text-center mb-6">Join Text Chat</h3>
              <input 
                type="text"
                [(ngModel)]="userName"
                placeholder="Enter your name..."
                class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white mb-4">
              <button 
                (click)="startTextChat()"
                class="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition">
                Start Chatting
              </button>
            </div>
          </div>
        }

        <!-- Connecting Screen -->
        @if (isConnecting && !isInChat) {
          <div class="bg-gray-800/50 backdrop-blur-md rounded-b-2xl p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <h3 class="text-xl text-white mb-2">Finding a partner...</h3>
            <p class="text-gray-400">Please wait while we connect you</p>
          </div>
        }

        <!-- Chat Screen -->
        @if (isInChat) {
          <div class="bg-gray-800/50 backdrop-blur-md rounded-b-2xl">
            <!-- Messages -->
            <div #messageContainer class="chat-messages h-96 overflow-y-auto p-4 space-y-3">
              @for (message of messages; track message.timestamp) {
                <div class="flex" [class.justify-end]="message.isOwn">
                  <div class="max-w-[70%]">
                    <div class="text-xs text-gray-400 mb-1 px-2">
                      {{ message.isOwn ? 'You' : message.userName }}
                    </div>
                    <div class="rounded-lg px-4 py-2" 
                         [class.bg-purple-600]="message.isOwn"
                         [class.bg-gray-700]="!message.isOwn">
                      <p class="text-white">{{ message.content }}</p>
                    </div>
                    <div class="text-xs text-gray-500 mt-1 px-2">
                      {{ message.timestamp | date:'shortTime' }}
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Input -->
            <div class="border-t border-gray-700 p-4">
              <div class="flex gap-2">
                <input 
                  type="text"
                  [(ngModel)]="newMessage"
                  (keyup.enter)="sendMessage()"
                  placeholder="Type a message..."
                  class="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white">
                <button 
                  (click)="sendMessage()"
                  class="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-500 hover:to-blue-500 transition">
                  Send
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-messages {
      scroll-behavior: smooth;
    }
  `]
})
export class TextChatComponent implements OnInit, OnDestroy {
  private signalRService = inject(MockSignalRService);
  private router = inject(Router);
  
  userName = '';
  isConnecting = false;
  isInChat = false;
  partnerId = '';
  newMessage = '';
  messages: Message[] = [];
  
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.subscriptions.push(
      this.signalRService.matched$.subscribe(async (partnerId) => {
        this.partnerId = partnerId;
        this.isInChat = true;
        this.isConnecting = false;
      })
    );

    // Add text message handling here
    // You'll need to extend SignalR service for text messages
  }

  async startTextChat() {
    if (!this.userName.trim()) return;
    
    this.isConnecting = true;
    const connected = await this.signalRService.startConnection(this.userName);
    if (!connected) {
      this.isConnecting = false;
      alert('Failed to connect');
    }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    this.messages.push({
      userName: this.userName,
      content: this.newMessage,
      timestamp: new Date(),
      isOwn: true
    });
    
    // Send to partner via SignalR
    // await this.signalRService.sendMessage(this.partnerId, this.newMessage);
    
    this.newMessage = '';
  }

  endChat() {
    this.isInChat = false;
    this.messages = [];
    this.signalRService.disconnect();
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.signalRService.disconnect();
  }
}