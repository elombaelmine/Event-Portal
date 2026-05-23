import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData, addDoc, query, where, doc, getDoc, docData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { addIcons } from 'ionicons';
import { map } from 'rxjs';
import {
  personCircleOutline, searchOutline, calendarOutline,
  locationOutline, timeOutline, notificationsOutline,
  checkmarkCircleOutline, alertCircleOutline
} from 'ionicons/icons';


@Component({
  selector: 'app-view-events',
  templateUrl: './view-events.page.html',
  styleUrls: ['./view-events.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ViewEventsPage implements OnInit {

  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private router = inject(Router);

  allEvents: any[] = [];
  filteredEvents: any[] = [];
  searchQuery: string = '';
  joinedEventIds: string[] = [];
  showNotifications = false;
  
  notifications: any[] = [];
  profileImage = '';

  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor() {
    addIcons({
      personCircleOutline, searchOutline, calendarOutline,
      locationOutline, timeOutline, notificationsOutline,
      checkmarkCircleOutline, alertCircleOutline
    });
  }

  ngOnInit() {
    // load events
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection, { idField: 'id' }).subscribe((events: any[]) => {
      this.allEvents = events.filter(
        event => event.status === 'Upcoming' && !event.isDraft
      );
      this.applySearch();
    });

    // listen for new events — detect truly new ones after first load
    let isFirstLoad = true;
    const seenEventIds: string[] = JSON.parse(
      localStorage.getItem('seenEventIds') || '[]'
    );

    collectionData(eventsCollection, { idField: 'id' }).subscribe((events: any[]) => {
      const publishedEvents = events.filter(
        e => !e.isDraft && e.status === 'Upcoming'
      );

      if (isFirstLoad) {
        // on first load just mark all current events as seen
        publishedEvents.forEach(e => {
          if (!seenEventIds.includes(e.id)) {
            seenEventIds.push(e.id);
          }
        });
        localStorage.setItem('seenEventIds', JSON.stringify(seenEventIds));
        isFirstLoad = false;
      } else {
        // on subsequent updates detect truly new events
        const newEvents = publishedEvents.filter(
          e => !seenEventIds.includes(e.id)
        );

        newEvents.forEach(e => {
          const exists = this.notifications.find(n => n.id === e.id + '_new');
          if (!exists) {
            this.notifications.unshift({
              id: e.id + '_new',
              type: 'new',
              title: '🎉 New Event Posted!',
              message: `"${e.title}" on ${e.date || 'TBA'} at ${e.location || 'TBA'}`,
              time: new Date(),
              read: false
            });
          }
          seenEventIds.push(e.id);
          localStorage.setItem('seenEventIds', JSON.stringify(seenEventIds));
        });
      }
    });

    // load user registrations and profile image
    const user = this.auth.currentUser;
    if (user) {
      // load registrations
      const regsCollection = collection(this.firestore, 'registrations');
      const q = query(regsCollection, where('userId', '==', user.uid));
      collectionData(q, { idField: 'id' }).subscribe((regs: any[]) => {
        this.joinedEventIds = regs.map(r => r.eventId);
        this.buildNotifications(regs);
      });

     // load profile image in real-time
     
      docData(doc(this.firestore, 'users', user.uid)).subscribe((data: any) => {
        if (data) {
          this.profileImage = data['profileImage'] || '';
        }
      });
    }
  }
applySearch() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredEvents = this.allEvents;
    } else {
      this.filteredEvents = this.allEvents.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }
  }

  onSearchChange() {
    this.applySearch();
  }
  buildNotifications(regs: any[]) {
    const notifs: any[] = [];
    const now = new Date();

   regs.forEach(reg => {
      // registration confirmation — use eventId to prevent duplicates
      const confirmId = reg.eventId + '_joined';
      const alreadyExists = notifs.find(n => n.id === confirmId);
      if (!alreadyExists) {
        notifs.push({
          id: confirmId,
          type: 'success',
          title: 'Registration Confirmed ✅',
          message: `You joined "${reg.eventTitle}"`,
          time: new Date(reg.registeredAt),
          read: false
        });
      }

      if (reg.eventStartTime) {
        const start = new Date(reg.eventStartTime);
        const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 24) {
          notifs.push({
            id: reg.id + '_reminder',
            type: 'reminder',
            title: '⏰ Event Tomorrow!',
            message: `"${reg.eventTitle}" starts tomorrow!`,
            time: new Date(),
            read: false
          });
        }

        if (diffHours > 0 && diffHours <= 1) {
          notifs.push({
            id: reg.id + '_soon',
            type: 'alert',
            title: '🚨 Starting Soon!',
            message: `"${reg.eventTitle}" starts in less than 1 hour!`,
            time: new Date(),
            read: false
          });
        }
      }
    });

    // merge with existing new-event notifications
    const newEventNotifs = this.notifications.filter(n => n.type === 'new');
    const merged = [...notifs, ...newEventNotifs].sort((a, b) =>
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    this.notifications = merged;
  }

  isJoined(eventId: string): boolean {
    return this.joinedEventIds.includes(eventId);
  }

  async registerForEvent(eventItem: any) {
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // double check — prevent duplicate registration
    if (this.isJoined(eventItem.id)) return;

    // immediately update local state to prevent double click
    this.joinedEventIds = [...this.joinedEventIds, eventItem.id];

    try {
      await addDoc(collection(this.firestore, 'registrations'), {
        eventId: eventItem.id,
        eventTitle: eventItem.title,
        eventStartTime: eventItem.startTime || '',
        eventDate: eventItem.date || '',
        eventLocation: eventItem.location || '',
        userId: user.uid,
        userEmail: user.email || '',
        registeredAt: new Date().toISOString()
      });

      // add notification only once
      const alreadyNotified = this.notifications
        .find(n => n.id === eventItem.id + '_joined');

      if (!alreadyNotified) {
        this.notifications.unshift({
          id: eventItem.id + '_joined',
          type: 'success',
          title: 'Registration Confirmed ✅',
          message: `You joined "${eventItem.title}"`,
          time: new Date(),
          read: false
        });
      }

      alert(`Successfully joined "${eventItem.title}"! ✅`);
    } catch (error: any) {
      // revert local state if save failed
      this.joinedEventIds = this.joinedEventIds.filter(id => id !== eventItem.id);
      alert('Error: ' + error.message);
    }
  }

  openNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markRead(notif: any) {
    notif.read = true;
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this.showNotifications = false;
  }

  getNotifIcon(type: string): string {
    switch (type) {
      case 'success': return 'checkmark-circle-outline';
      case 'reminder': return 'time-outline';
      case 'alert': return 'alert-circle-outline';
      case 'new': return 'calendar-outline';
      default: return 'notifications-outline';
    }
  }

  getNotifColor(type: string): string {
    switch (type) {
      case 'success': return '#2d9e6b';
      case 'reminder': return '#0a9396';
      case 'alert': return '#f4a261';
      case 'new': return '#005f73';
      default: return '#888';
    }
  }

  goToProfile() {
    this.router.navigate(['/home/profile']);
  }
}