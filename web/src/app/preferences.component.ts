import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface PreferencesResponse {
  success: boolean;
  preferences: string | null;
}

interface UpdatePreferencesResponse {
  success: boolean;
  updated: boolean;
  preferences: string | null;
}

interface WritePreferencesResponse {
  success: boolean;
  preferences: string;
}

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="preferences-shell">
      <div class="preferences-header">
        <div>
          <h2>View Preferences</h2>
          <p>Your saved preferences are read-only here. Update them through chat below.</p>
        </div>
      </div>

      <div class="preferences-card">
        <div class="section-title">Saved Preferences</div>

        <div *ngIf="loading" class="state-message">Loading preferences...</div>
        <div *ngIf="!loading && savedPreferenceItems.length === 0" class="state-message muted">
          No saved preferences yet.
        </div>

        <ul *ngIf="!loading && savedPreferenceItems.length > 0" class="preferences-list">
          <li *ngFor="let item of savedPreferenceItems">{{ item }}</li>
        </ul>
      </div>

      <div class="preferences-card" *ngIf="proposedPreferencesText">
        <div class="section-title">Proposed Preference Update</div>
        <p class="chat-hint">Review the proposed list below. Saved preferences will only change after you confirm.</p>

        <ul class="preferences-list">
          <li *ngFor="let item of proposedPreferenceItems">{{ item }}</li>
        </ul>

        <div class="chat-actions">
          <button class="btn btn-secondary" (click)="discardProposal()" [disabled]="confirming">
            Cancel
          </button>
          <button class="btn btn-primary" (click)="confirmProposal()" [disabled]="confirming">
            {{ confirming ? 'Saving...' : 'Confirm Update' }}
          </button>
        </div>
      </div>

      <div class="preferences-card">
        <div class="section-title">Preference Chat</div>
        <p class="chat-hint">Describe a new preference naturally. The saved list updates only when something new is learned.</p>

        <div *ngIf="statusMessage" class="status-banner" [class.error]="statusIsError">
          {{ statusMessage }}
        </div>

        <label class="chat-label" for="preference-input">Message</label>
        <textarea
          id="preference-input"
          [(ngModel)]="chatInput"
          rows="4"
          placeholder="Example: I prefer meetings after 10am and short summaries."
        ></textarea>

        <div class="chat-actions">
          <button class="btn btn-secondary" (click)="clearInput()" [disabled]="submitting">Clear</button>
          <button class="btn btn-primary" (click)="submitPreference()" [disabled]="submitting">
            {{ submitting ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .preferences-shell {
      display: grid;
      gap: 1.5rem;
    }

    .preferences-header {
      background: rgba(255, 255, 255, 0.94);
      border-radius: 20px;
      padding: 1.5rem 2rem;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
    }

    .preferences-header h2 {
      margin: 0;
      font-size: 1.8rem;
      color: #23324d;
    }

    .preferences-header p {
      margin: 0.4rem 0 0;
      color: #5c6b86;
    }

    .preferences-card {
      background: rgba(255, 255, 255, 0.96);
      border-radius: 20px;
      padding: 1.5rem 2rem;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.1);
    }

    .section-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
      color: #6b46c1;
      margin-bottom: 1rem;
    }

    .preferences-list {
      margin: 0;
      padding-left: 1.2rem;
      color: #1f2937;
      line-height: 1.6;
    }

    .preferences-list li + li {
      margin-top: 0.55rem;
    }

    .state-message {
      color: #243b53;
      font-weight: 600;
    }

    .state-message.muted {
      color: #6b7280;
      font-weight: 500;
    }

    .chat-hint {
      margin: 0 0 1rem;
      color: #5c6b86;
    }

    .chat-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 700;
      color: #243b53;
    }

    textarea {
      width: 100%;
      resize: vertical;
      border: 1px solid #d2d8e3;
      border-radius: 14px;
      padding: 0.85rem 1rem;
      font-size: 0.98rem;
      font-family: inherit;
      color: #1f2937;
      box-sizing: border-box;
    }

    textarea:focus {
      outline: none;
      border-color: #6b46c1;
      box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.15);
    }

    .chat-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .btn {
      padding: 0.7rem 1.2rem;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #6b46c1 0%, #4338ca 100%);
      color: white;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #1f2937;
    }

    .status-banner {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      background: #ecfdf3;
      color: #166534;
      border: 1px solid #86efac;
      font-weight: 600;
    }

    .status-banner.error {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fca5a5;
    }
  `]
})
export class PreferencesComponent implements OnInit {
  private apiUrl = 'http://localhost:8000';

  loading = false;
  submitting = false;
  confirming = false;
  chatInput = '';
  preferencesText = '';
  proposedPreferencesText: string | null = null;
  statusMessage = '';
  statusIsError = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchPreferences();
  }

  get savedPreferenceItems(): string[] {
    return this.toPreferenceItems(this.preferencesText);
  }

  get proposedPreferenceItems(): string[] {
    return this.toPreferenceItems(this.proposedPreferencesText ?? '');
  }

  private toPreferenceItems(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^[-*]\s*/, ''));
  }

  fetchPreferences(): void {
    this.loading = true;
    this.statusMessage = '';

    this.http.get<PreferencesResponse>(`${this.apiUrl}/preferences`).subscribe({
      next: (response) => {
        this.loading = false;
        this.preferencesText = response.preferences ?? '';
        this.proposedPreferencesText = null;
      },
      error: () => {
        this.loading = false;
        this.statusIsError = true;
        this.statusMessage = 'Failed to load preferences.';
      }
    });
  }

  submitPreference(): void {
    const message = this.chatInput.trim();
    if (!message) {
      this.statusIsError = true;
      this.statusMessage = 'Enter a preference message before sending.';
      return;
    }

    this.submitting = true;
    this.statusMessage = '';
    this.statusIsError = false;
    this.proposedPreferencesText = null;

    const params = new URLSearchParams();
    params.set('new_input', message);

    this.http.post<UpdatePreferencesResponse>(`${this.apiUrl}/update_preferences?${params.toString()}`, {}).subscribe({
      next: (response) => {
        this.submitting = false;

        if (response.updated && response.preferences) {
          this.proposedPreferencesText = response.preferences;
          this.statusMessage = 'Review the proposed preference update below.';
          return;
        }

        this.chatInput = '';
        this.statusMessage = 'Nothing to update.';
      },
      error: () => {
        this.submitting = false;
        this.statusIsError = true;
        this.statusMessage = 'Failed to update preferences.';
      }
    });
  }

  confirmProposal(): void {
    const proposed = this.proposedPreferencesText?.trim();
    if (!proposed) {
      return;
    }

    this.confirming = true;
    this.statusMessage = '';
    this.statusIsError = false;

    const params = new URLSearchParams();
    params.set('preferences', proposed);

    this.http.post<WritePreferencesResponse>(`${this.apiUrl}/write_preferences?${params.toString()}`, {}).subscribe({
      next: (response) => {
        this.confirming = false;
        this.preferencesText = response.preferences ?? proposed;
        this.proposedPreferencesText = null;
        this.chatInput = '';
        this.statusMessage = 'Preferences saved.';
      },
      error: () => {
        this.confirming = false;
        this.statusIsError = true;
        this.statusMessage = 'Failed to save preferences.';
      }
    });
  }

  discardProposal(): void {
    this.proposedPreferencesText = null;
    this.statusMessage = 'Preference update discarded.';
    this.statusIsError = false;
  }

  clearInput(): void {
    this.chatInput = '';
    this.statusMessage = '';
    this.statusIsError = false;
    this.proposedPreferencesText = null;
  }
}