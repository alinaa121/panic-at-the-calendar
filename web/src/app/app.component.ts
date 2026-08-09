import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from './calendar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CalendarComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <h1 class="app-title">
            <span class="title-accent">Calendar</span> AI
          </h1>
          <p class="app-subtitle">Intelligent Schedule Management</p>
        </div>
      </header>
      
      <main class="app-main">
        <app-calendar></app-calendar>
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
export class AppComponent {}
