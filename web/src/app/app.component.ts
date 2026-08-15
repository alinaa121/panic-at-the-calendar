import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from './calendar.component';
import { PreferencesComponent } from './preferences.component';
import { ChatComponent } from './chat.component';
import { ApprovalsComponent } from './approvals.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CalendarComponent, PreferencesComponent, ChatComponent, ApprovalsComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <h1 class="app-title">
            <span class="title-accent">Panic at The Calendar!!</span>
          </h1>
          <p class="app-subtitle">(no more)</p>
        </div>
      </header>

      <nav class="app-tabs" aria-label="Primary views">
        <button class="tab-button" [class.active]="activeTab === 'calendar'" (click)="activeTab = 'calendar'">
          Calendar
        </button>
        <button class="tab-button" [class.active]="activeTab === 'approvals'" (click)="activeTab = 'approvals'">
          Approvals
          <span class="badge" *ngIf="approvalCount > 0">{{ approvalCount }}</span>
        </button>
        <button class="tab-button" [class.active]="activeTab === 'preferences'" (click)="activeTab = 'preferences'">
          View Preferences
        </button>
      </nav>
      
      <main class="app-main">
        <app-calendar *ngIf="activeTab === 'calendar'"></app-calendar>
        <app-approvals *ngIf="activeTab === 'approvals'" (approvalCountChanged)="onApprovalCountChanged($event)"></app-approvals>
        <app-preferences *ngIf="activeTab === 'preferences'"></app-preferences>
        <app-chat *ngIf="activeTab === 'calendar'"></app-chat>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #ffd140 100%);
      padding: 2rem;
    }

    .app-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .app-tabs {
      max-width: 1400px;
      margin: 0 auto 1.5rem;
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .tab-button {
      border: none;
      border-radius: 999px;
      padding: 0.8rem 1.35rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #32425c;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
    }

    .tab-button:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.96);
    }

    .tab-button.active {
      color: white;
      background: linear-gradient(135deg, #6b46c1 0%, #4338ca 100%);
    }

    .badge {
      display: inline-block;
      background: #ef4444;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      margin-left: 0.5rem;
      min-width: 20px;
      text-align: center;
    }

    .tab-button.active .badge {
      background: rgba(255, 255, 255, 0.3);
    }

    .header-content {
      display: inline-block;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 1.5rem 3rem;
      border-radius: 20px;
      border: none;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    }

    .app-title {
      margin: 0;
      color: #2d3748;
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .title-accent {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .app-subtitle {
      margin: 0.5rem 0 0 0;
      color: #718096;
      font-size: 0.95rem;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .app-main {
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class AppComponent {
  activeTab: 'calendar' | 'approvals' | 'preferences' = 'calendar';
  approvalCount: number = 0;

  onApprovalCountChanged(count: number) {
    this.approvalCount = count;
  }
}
