import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CalendarService, CalendarEvent } from './calendar.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
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
    this.calendarService.getEvents(startDate, endDate).subscribe({
      next: (response) => {
        this.generateCalendarDays(startDate, endDate, response.events);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.generateCalendarDays(startDate, endDate, []);
        this.loading = false;
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
}
