import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage, ChatResponse } from './chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isMinimized: boolean = false;
  error: string = '';

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    // Add welcome message
    this.messages.push({
      role: 'assistant',
      content: 'Hi! I\'m your calendar assistant. I can help you view your schedule, create events, update them, or answer questions about your calendar. What would you like to do?',
      timestamp: new Date()
    });
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput.trim(),
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const messageText = this.userInput.trim();
    this.userInput = '';
    this.isLoading = true;
    this.error = '';

    this.chatService.sendMessage(messageText).subscribe({
      next: (response: ChatResponse) => {
        this.isLoading = false;
        
        if (response.status === 'success') {
          // Extract just the tool names from tool_actions
          const toolNames = response.tool_actions?.map((action: string) => {
            // Extract tool name from "Used tool_name: ..." format
            const match = action.match(/Used ([^:]+)/);
            return match ? match[1].replace(/_/g, ' ') : '';
          }).filter((name: string) => name) || [];

          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.agent_response || 'I processed your request.',
            timestamp: new Date(),
            toolsUsed: toolNames
          };
          this.messages.push(assistantMessage);
        } else {
          this.error = response.error || 'An error occurred while processing your request.';
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `Sorry, I encountered an error: ${this.error}`,
            timestamp: new Date()
          };
          this.messages.push(errorMessage);
        }

        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to communicate with the calendar agent.';
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I couldn\'t connect to the server. Please try again.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        console.error('Chat error:', err);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  clearChat() {
    this.messages = [];
    this.ngOnInit(); // Reset with welcome message
  }

  private scrollToBottom() {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatMessageContent(content: string): string {
    // Convert markdown-style formatting to HTML
    let formatted = content
      // Convert **bold** to <strong>
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Convert *italic* to <em>
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Convert line breaks to <br>
      .replace(/\n/g, '<br>')
      // Convert numbered lists
      .replace(/^(\d+)\.\s/gm, '<br>$1. ')
      // Convert bullet points
      .replace(/^[-•]\s/gm, '<br>• ');
    
    return formatted;
  }
}
