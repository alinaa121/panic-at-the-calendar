import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CalendarService, CalendarEvent } from './calendar.service';
import { finalize } from 'rxjs/operators';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class CalendarComponent implements OnInit {
  currentDate: Date = new Date();
  viewMode: 'day' | 'week' | 'month' = 'month';
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  loading: boolean = false;
  selectedEvent: CalendarEvent | null = null;
  dropdownOpen: boolean = false;
  createModalOpen: boolean = false;
  editModalOpen: boolean = false;
  creatingEvent: boolean = false;
  updatingEvent: boolean = false;
  deletingEvent: boolean = false;
  dragUpdatingEvent: boolean = false;
  draggingEvent: CalendarEvent | null = null;
  dragOverDayKey: string | null = null;
  actionError: string = '';
  newEvent = {
    summary: '',
    location: '',
    description: '',
    start: '',
    end: ''
  };
  editEvent = {
    id: '',
    summary: '',
    location: '',
    description: '',
    start: '',
    end: ''
  };

  constructor(
    private calendarService: CalendarService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadCalendar();
  }

  loadCalendar() {
    if (this.viewMode === 'month') {
      this.loadMonthView();
    } else if (this.viewMode === 'week') {
      this.loadWeekView();
    } else {
      this.loadDayView();
    }
  }

  loadMonthView() {
    this.loading = true;
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get start date (include previous month days to fill week)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get end date (include next month days to fill week)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    this.loadEvents(startDate, endDate);
  }

  loadWeekView() {
    this.loading = true;
    const startDate = this.getStartOfWeek(this.currentDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    this.loadEvents(startDate, endDate);
  }

  loadDayView() {
    this.loading = true;
    const startDate = new Date(this.currentDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(this.currentDate);
    endDate.setHours(23, 59, 59, 999);
    
    this.loadEvents(startDate, endDate);
  }

  loadEvents(startDate: Date, endDate: Date) {
    this.calendarService.getEvents(startDate, endDate)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
      next: (response) => {
        const safeEvents = Array.isArray(response?.events) ? response.events : [];
        this.generateCalendarDays(startDate, endDate, safeEvents);
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.generateCalendarDays(startDate, endDate, []);
      }
    });
  }

  generateCalendarDays(startDate: Date, endDate: Date, events: CalendarEvent[]) {
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dayEvents = this.getEventsForDay(currentDate, events);
      
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === this.currentDate.getMonth(),
        isToday: currentDate.getTime() === today.getTime(),
        events: dayEvents
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.calendarDays = days;
  }

  getEventsForDay(date: Date, events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }

  previousPeriod() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
    }
    this.currentDate = new Date(this.currentDate);
    this.loadCalendar();
  }

  nextPeriod() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
    }
    this.currentDate = new Date(this.currentDate);
    this.loadCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.loadCalendar();
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.view-dropdown');
    
    if (!dropdown && this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  setView(view: 'day' | 'week' | 'month') {
    this.viewMode = view;
    this.dropdownOpen = false;
    this.loadCalendar();
  }

  getCurrentViewIcon(): string {
    const icons = { day: 'D', week: 'W', month: 'M' };
    return icons[this.viewMode];
  }

  getCurrentViewLabel(): string {
    const labels = { day: 'Day', week: 'Week', month: 'Month' };
    return labels[this.viewMode];
  }

  getDayEventCount(): number {
    return this.calendarDays[0]?.events?.length || 0;
  }

  selectEvent(event: CalendarEvent) {
    this.selectedEvent = event;
  }

  closeEventDetails() {
    this.selectedEvent = null;
    this.actionError = '';
  }

  openCreateEventModal() {
    this.createModalOpen = true;
    this.actionError = '';

    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    this.newEvent = {
      summary: '',
      location: '',
      description: '',
      start: this.toDatetimeLocal(start),
      end: this.toDatetimeLocal(end)
    };
  }

  closeCreateEventModal() {
    this.createModalOpen = false;
    this.actionError = '';
  }

  openEditEventModal() {
    if (!this.selectedEvent) {
      return;
    }

    this.actionError = '';
    this.editModalOpen = true;
    this.editEvent = {
      id: this.selectedEvent.id,
      summary: this.selectedEvent.summary || '',
      location: this.selectedEvent.location || '',
      description: this.toPlainText(this.selectedEvent.description),
      start: this.toDatetimeLocal(new Date(this.selectedEvent.start)),
      end: this.toDatetimeLocal(new Date(this.selectedEvent.end))
    };
  }

  closeEditEventModal() {
    this.editModalOpen = false;
    this.actionError = '';
  }

  createEvent() {
    this.actionError = '';

    if (!this.newEvent.start || !this.newEvent.end) {
      this.actionError = 'Start and end are required.';
      return;
    }

    if (new Date(this.newEvent.end) <= new Date(this.newEvent.start)) {
      this.actionError = 'End time must be after start time.';
      return;
    }

    this.creatingEvent = true;
    this.calendarService.createEvent({
      start: this.newEvent.start,
      end: this.newEvent.end,
      summary: this.newEvent.summary,
      location: this.newEvent.location,
      description: this.newEvent.description
    }).subscribe({
      next: () => {
        this.creatingEvent = false;
        this.closeCreateEventModal();
        this.loadCalendar();
      },
      error: (error) => {
        console.error('Error creating event:', error);
        this.creatingEvent = false;
        this.actionError = 'Failed to create event.';
      }
    });
  }

  updateEvent() {
    this.actionError = '';

    if (!this.editEvent.id) {
      this.actionError = 'Missing event ID for update.';
      return;
    }

    if (!this.editEvent.start || !this.editEvent.end) {
      this.actionError = 'Start and end are required.';
      return;
    }

    if (new Date(this.editEvent.end) <= new Date(this.editEvent.start)) {
      this.actionError = 'End time must be after start time.';
      return;
    }

    this.updatingEvent = true;
    this.calendarService.updateEvent(this.editEvent.id, {
      start: this.editEvent.start,
      end: this.editEvent.end,
      summary: this.editEvent.summary,
      location: this.editEvent.location,
      description: this.editEvent.description,
    }).subscribe({
      next: () => {
        this.updatingEvent = false;
        this.closeEditEventModal();
        this.closeEventDetails();
        this.loadCalendar();
      },
      error: (error) => {
        console.error('Error updating event:', error);
        this.updatingEvent = false;
        this.actionError = 'Failed to update event.';
      }
    });
  }

  deleteSelectedEvent() {
    if (!this.selectedEvent) {
      return;
    }

    this.actionError = '';
    this.deletingEvent = true;

    this.calendarService.deleteEvent(this.selectedEvent.id).subscribe({
      next: () => {
        this.deletingEvent = false;
        this.closeEventDetails();
        this.loadCalendar();
      },
      error: (error) => {
        console.error('Error deleting event:', error);
        this.deletingEvent = false;
        this.actionError = 'Failed to delete event.';
      }
    });
  }

  onEventDragStart(event: DragEvent, calendarEvent: CalendarEvent) {
    this.draggingEvent = calendarEvent;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', calendarEvent.id);
    }
  }

  onEventDragEnd() {
    this.draggingEvent = null;
    this.dragOverDayKey = null;
  }

  onDayDragOver(event: DragEvent, day: CalendarDay) {
    event.preventDefault();
    if (!this.draggingEvent) {
      return;
    }

    this.dragOverDayKey = day.date.toDateString();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDayDragLeave(day: CalendarDay) {
    if (this.dragOverDayKey === day.date.toDateString()) {
      this.dragOverDayKey = null;
    }
  }

  onEventDrop(event: DragEvent, day: CalendarDay) {
    event.preventDefault();
    this.dragOverDayKey = null;

    if (!this.draggingEvent || this.dragUpdatingEvent) {
      return;
    }

    const originalStart = new Date(this.draggingEvent.start);
    const originalEnd = new Date(this.draggingEvent.end);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    const nextStart = new Date(day.date);
    nextStart.setHours(
      originalStart.getHours(),
      originalStart.getMinutes(),
      originalStart.getSeconds(),
      originalStart.getMilliseconds()
    );
    const nextEnd = new Date(nextStart.getTime() + durationMs);

    if (nextStart.getTime() === originalStart.getTime() && nextEnd.getTime() === originalEnd.getTime()) {
      this.draggingEvent = null;
      return;
    }

    this.dragUpdatingEvent = true;
    this.calendarService.updateEvent(this.draggingEvent.id, {
      start: this.toDatetimeLocal(nextStart),
      end: this.toDatetimeLocal(nextEnd),
      summary: this.draggingEvent.summary,
      location: this.draggingEvent.location,
      description: this.draggingEvent.description,
    }).subscribe({
      next: () => {
        this.draggingEvent = null;
        this.dragUpdatingEvent = false;
        this.loadCalendar();
      },
      error: (error) => {
        console.error('Error dragging event:', error);
        this.draggingEvent = null;
        this.dragUpdatingEvent = false;
        this.actionError = 'Failed to reschedule event by drag-and-drop.';
      }
    });
  }

  private toDatetimeLocal(value: Date): string {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  get currentPeriodLabel(): string {
    if (this.viewMode === 'month') {
      return `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    } else if (this.viewMode === 'week') {
      const startOfWeek = this.getStartOfWeek(this.currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      return `${this.monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${this.monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    } else {
      return `${this.weekDays[this.currentDate.getDay()]}, ${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getDate()}, ${this.currentDate.getFullYear()}`;
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getCleanDescription(description: string | undefined): SafeHtml {
    if (!description) return '';
    
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = description;
    
    // Extract text content and preserve basic formatting
    const text = temp.textContent || temp.innerText || '';
    
    // Convert line breaks to <br> tags and sanitize
    const formatted = text.trim().replace(/\n/g, '<br>');
    
    // Return sanitized HTML
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  getDescriptionPreview(description: string | undefined): string {
    if (!description) return '';
    
    // Create a temporary element to parse HTML and extract text
    const temp = document.createElement('div');
    temp.innerHTML = description;
    const text = (temp.textContent || temp.innerText || '').trim();
    
    // Return first 100 characters
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  private toPlainText(description: string | undefined): string {
    if (!description) {
      return '';
    }

    const temp = document.createElement('div');
    temp.innerHTML = description;
    return (temp.textContent || temp.innerText || '').trim();
  }
}
