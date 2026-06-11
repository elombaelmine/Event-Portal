import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, calendarOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-calender',
  templateUrl: './calender.page.html',
  styleUrls: ['./calender.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CalenderPage implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  currentDate: Date = new Date();
  displayMonthAndYear: string = '';
  daysOfWeek: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: (number | null)[] = [];
  todayDay: number | null = null;

  // Holds raw string dates student registered for (e.g., ['2026-05-23'])
  registeredDates: string[] = [];
  // Holds all published general event dates on campus
  allEventDates: string[] = [];
  
  // Array list for rendering registration cards below the calendar
  registeredEventsList: any[] = [];

  private authSub!: Subscription;
  private dataSubs: Subscription[] = [];
  currentUserId: string = '';

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, calendarOutline });
  }

  ngOnInit() {
    // Monitor auth state to safely query user-specific registrations
    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.loadFirestoreCalendarData();
      }
    });
    this.generateCalendar();
  }

  loadFirestoreCalendarData() {
    //  Fetch overall general campus events to light up "Has Event" status dots
    const eventsRef = collection(this.firestore, 'events');
    const eventsSub = collectionData(eventsRef).subscribe((events: any[]) => {
      this.allEventDates = events
        .map(e => this.normalizeDateKey(e.date))
        .filter(Boolean) as string[];
    });
    this.dataSubs.push(eventsSub);

    //  Fetch registrations belonging specifically to this logged-in student user
    const regRef = collection(this.firestore, 'registrations');
    const regQuery = query(regRef, where('userId', '==', this.currentUserId));
    const regSub = collectionData(regQuery).subscribe((regs: any[]) => {
      const studentRegs = regs.filter(r => r.studentId === this.currentUserId || r.userId === this.currentUserId);

      this.registeredDates = studentRegs
        .map(r => this.normalizeDateKey(r.eventDate) || this.normalizeDateKey(r.eventStartTime))
        .filter(Boolean) as string[];
      this.registeredEventsList = studentRegs;
    });
    this.dataSubs.push(regSub);
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.displayMonthAndYear = this.currentDate.toLocaleString('default', { 
      month: 'long', 
      year: 'numeric' 
    });

    const realToday = new Date();
    if (year === realToday.getFullYear() && month === realToday.getMonth()) {
      this.todayDay = realToday.getDate();
    } else {
      this.todayDay = null;
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysArray: (number | null)[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      daysArray.push(day);
    }

    this.calendarDays = daysArray;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  private normalizeDateKey(value: any): string | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return this.formatDateKey(parsed);
      }
      return null;
    }

    if (value instanceof Date) {
      return this.formatDateKey(value);
    }

    if (typeof value === 'object' && typeof value.toDate === 'function') {
      return this.formatDateKey(value.toDate());
    }

    return null;
  }

  // Helper utility to match calendar grid days to database date string keys (YYYY-MM-DD)
  private getFormattedStringDate(day: number): string {
    const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
    return this.formatDateKey(date);
  }

  isRegistered(day: number | null): boolean {
    if (!day) return false;
    const dateStr = this.getFormattedStringDate(day);
    return this.registeredDates.includes(dateStr);
  }

  isHasEvent(day: number | null): boolean {
    if (!day) return false;
    const dateStr = this.getFormattedStringDate(day);
    // Don't show event dot if user is already registered for it (keeps UI clean)
    return this.allEventDates.includes(dateStr) && !this.isRegistered(day);
  }

  goToPreviousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentDate = new Date(this.currentDate);
    this.generateCalendar();
  }

  goToNextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.currentDate = new Date(this.currentDate);
    this.generateCalendar();
  }

  ngOnDestroy() {
    if (this.authSub) this.authSub.unsubscribe();
    this.dataSubs.forEach(sub => sub.unsubscribe());
  }
}