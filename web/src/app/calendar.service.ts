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

export interface CreateEventResponse {
  success: boolean;
  event: CalendarEvent;
}

export interface DeleteEventResponse {
  success: boolean;
  event_id: string;
}

export interface UpdateEventResponse {
  success: boolean;
  event: CalendarEvent;
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

  createEvent(payload: {
    start: string;
    end: string;
    location?: string;
    description?: string;
    summary?: string;
  }): Observable<CreateEventResponse> {
    const params = new URLSearchParams();
    params.set('start', payload.start);
    params.set('end', payload.end);
    if (payload.location) params.set('location', payload.location);
    if (payload.description) params.set('description', payload.description);
    if (payload.summary) params.set('summary', payload.summary);

    return this.http.post<CreateEventResponse>(
      `${this.apiUrl}/create_event?${params.toString()}`,
      {}
    );
  }

  deleteEvent(eventId: string): Observable<DeleteEventResponse> {
    const params = new URLSearchParams();
    params.set('event_id', eventId);

    return this.http.post<DeleteEventResponse>(
      `${this.apiUrl}/delete_event?${params.toString()}`,
      {}
    );
  }

  updateEvent(eventId: string, payload: {
    start?: string;
    end?: string;
    location?: string;
    description?: string;
    summary?: string;
  }): Observable<UpdateEventResponse> {
    const params = new URLSearchParams();
    params.set('event_id', eventId);
    if (payload.start) params.set('start', payload.start);
    if (payload.end) params.set('end', payload.end);
    if (payload.location != null) params.set('location', payload.location);
    if (payload.description != null) params.set('description', payload.description);
    if (payload.summary != null) params.set('summary', payload.summary);

    return this.http.post<UpdateEventResponse>(
      `${this.apiUrl}/update_event?${params.toString()}`,
      {}
    );
  }
}
