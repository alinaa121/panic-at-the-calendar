import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  colorId?: string;
}

export interface EventsResponse {
  success: boolean;
  count: number;
  start_date: string;
  end_date: string;
  events: CalendarEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getEvents(startDate: Date, endDate: Date): Observable<EventsResponse> {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    
    return this.http.get<EventsResponse>(
      `${this.apiUrl}/events?start_date=${start}&end_date=${end}`
    );
  }
}
