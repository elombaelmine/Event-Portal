import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData, addDoc, query, where, doc, docData, updateDoc, deleteDoc, serverTimestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  personCircleOutline, searchOutline, calendarOutline,
  locationOutline, timeOutline, notificationsOutline,
  checkmarkCircleOutline, alertCircleOutline, trashOutline,
  closeCircleOutline
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
  
  userRegistrations: any[] = [];
  joinedEventIds: string[] = [];
  
  showNotifications = false;
  notifications: any[] = [];
  profileImage = '';
  
  private globalClearedAt: Date | null = null;

  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor() {
    addIcons({
      personCircleOutline, searchOutline, calendarOutline,
      locationOutline, timeOutline, notificationsOutline,
      checkmarkCircleOutline, alertCircleOutline, trashOutline,
      closeCircleOutline
    });
  }

  ngOnInit() {
    // 1. Load active system events cleanly
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection, { idField: 'id' }).subscribe((events: any[]) => {
      this.allEvents = events.filter(
        event => event && event['status'] === 'Upcoming' && !event['isDraft']
      );
      this.applySearch();
    });

    // 2. Load User Profile and bind Registrations & Notification Logs dynamically
    const user = this.auth.currentUser;
    if (user) {
      const userDocRef = doc(this.firestore, 'users', user.uid);
      const regsCollection = collection(this.firestore, 'registrations');
      const regsQuery = query(regsCollection, where('userId', '==', user.uid));

      // NEW: Listen directly to the persistent logs to drive our dropdown bell badges
      const notificationsCollection = collection(this.firestore, 'notifications');
      const logsQuery = query(notificationsCollection, where('userId', '==', user.uid));

      docData(userDocRef).pipe(
        switchMap((userProfile: any) => {
          if (userProfile) {
            this.profileImage = userProfile['profileImage'] || '';
            this.globalClearedAt = userProfile?.['notificationsClearedAt'] ? userProfile['notificationsClearedAt'].toDate() : null;
          }
          return combineLatest([
            collectionData(regsQuery, { idField: 'id' }),
            collectionData(logsQuery, { idField: 'id' }),
            collectionData(eventsCollection, { idField: 'id' })
          ]);
        })
      ).subscribe({
        next: ([regs, logs, events]) => {
          // Track registrations strictly to keep the "Join/Leave" buttons accurate on dashboard UI
          this.userRegistrations = regs || [];
          this.joinedEventIds = this.userRegistrations.map((r: any) => r['eventId']).filter(Boolean);
          
          // Process alerts using the persistent logs collection instead of live registrations array
          this.processSynchronizedAlerts(logs || [], events || []);
        },
        error: (err) => console.error("Error updating subscription streams:", err)
      });
    }
  }

  processSynchronizedAlerts(loggedNotifs: any[], events: any[]) {
    const sortedNotifs: any[] = [];
    const now = new Date();

    const isNotificationValid = (notificationTime: Date) => {
      if (!this.globalClearedAt) return true;
      return notificationTime.getTime() > this.globalClearedAt.getTime();
    };

    // --- SOURCE A: Persistent Notification Logs (Now handles both Confirmation AND Cancellation ticks!) ---
    loggedNotifs.forEach(log => {
      if (!log) return;
      
      const logTime = log['createdAt'] ? new Date(log['createdAt']) : new Date();
      
      if (isNotificationValid(logTime)) {
        sortedNotifs.push({
          id: log.id,
          type: log['category'] === 'Cancellation' ? 'alert' : 'success',
          title: log['title'] || 'Update',
          message: log['message'] || '',
          time: logTime,
          read: log['read'] !== undefined ? log['read'] : false
        });
      }
    });

    // --- SOURCE B: New Board Bulletins ---
    events.forEach(e => {
      if (e && !e['isDraft'] && e['status'] === 'Upcoming' && e['createdAt']) {
        const createdDate = new Date(e['createdAt']);
        const ageInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (ageInHours >= 0 && ageInHours <= 48 && isNotificationValid(createdDate)) {
          sortedNotifs.push({
            id: e['id'] + '_new',
            type: 'new',
            title: '🎉 New Event Posted!',
            message: `"${e['title']}" on ${e['date'] || 'TBA'}`,
            time: createdDate,
            read: false
          });
        }
      }
    });

    // Clean sort and update UI elements immediately
    this.notifications = sortedNotifs.sort((a, b) => b.time.getTime() - a.time.getTime());
  }

  applySearch() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredEvents = this.allEvents;
    } else {
      this.filteredEvents = this.allEvents.filter(e =>
        e['title']?.toLowerCase().includes(q) ||
        e['location']?.toLowerCase().includes(q) ||
        e['category']?.toLowerCase().includes(q) ||
        e['description']?.toLowerCase().includes(q)
      );
    }
  }

  onSearchChange() {
    this.applySearch();
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

    if (!eventItem || !eventItem.id) return;
    if (this.isJoined(eventItem.id)) return;

    this.joinedEventIds = [...this.joinedEventIds, eventItem.id];

    try {
      await addDoc(collection(this.firestore, 'registrations'), {
        eventId: eventItem.id,
        eventTitle: eventItem.title || '',
        eventStartTime: eventItem.startTime || eventItem.time || '',
        eventDate: eventItem.date || '',
        eventLocation: eventItem.location || '',
        userId: user.uid,
        userEmail: user.email || '',
        registeredAt: new Date().toISOString()
      });

      // Write permanent confirmation log entry to increments bell badges
      await addDoc(collection(this.firestore, 'notifications'), {
        userId: user.uid,
        eventId: eventItem.id,
        category: 'Registration',
        title: 'Registration Confirmed ✅',
        message: `You successfully joined "${eventItem.title}"`,
        isUrgent: false,
        read: false,
        createdAt: new Date().toISOString()
      });

      alert(`Successfully joined "${eventItem.title}"! ✅ Check your notification feed.`);

    } catch (error: any) {
      this.joinedEventIds = this.joinedEventIds.filter(id => id !== eventItem.id);
      alert('Registration failed: ' + error.message);
    }
  }

  async unjoinEvent(eventItem: any) {
    const user = this.auth.currentUser;
    if (!user || !eventItem || !eventItem.id) return;

    const matchingReg = this.userRegistrations.find(r => r && r['eventId'] === eventItem.id);
    
    if (!matchingReg || !matchingReg.id) {
      console.warn("Could not find a local registration document ID matching event:", eventItem.id);
      return;
    }

    if (confirm(`Are you sure you want to leave "${eventItem.title || 'this event'}"?`)) {
      try {
        const regDocRef = doc(this.firestore, `registrations/${matchingReg.id}`);
        await deleteDoc(regDocRef);
        
        this.joinedEventIds = this.joinedEventIds.filter(id => id !== eventItem.id);
        this.userRegistrations = this.userRegistrations.filter(r => r.id !== matchingReg.id);

        // Write permanent cancellation log entry to force bell count upward!
        await addDoc(collection(this.firestore, 'notifications'), {
          userId: user.uid,
          eventId: eventItem.id,
          category: 'Cancellation',
          title: 'Event Left ❌',
          message: `You removed yourself from "${eventItem.title}"`,
          isUrgent: false,
          read: false,
          createdAt: new Date().toISOString()
        });

        alert(`You have successfully removed yourself from "${eventItem.title}".`);

      } catch (error: any) {
        console.error("Error executing delete operations on Firestore:", error);
        alert('Could not cancel registration: ' + error.message);
      }
    }
  }

  openNotifications() {
    this.router.navigate(['/home/alert']);
  }

  async clearAllAlerts() {
    const user = this.auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        await updateDoc(userDocRef, {
          notificationsClearedAt: serverTimestamp()
        });
        this.notifications = [];
        this.showNotifications = false;
      } catch (err) {
        console.error("Could not write global wipe action to Firestore:", err);
      }
    }
  }

  markRead(notif: any) {
    if (notif) notif.read = true;
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