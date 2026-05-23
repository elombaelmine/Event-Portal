import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData, doc, deleteDoc, getDoc } from '@angular/fire/firestore';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline, createOutline, trashOutline,
  locationOutline, timeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-event',
  templateUrl: './event.page.html',
  styleUrls: ['./event.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon
  ]
})
export class EventPage implements OnInit {

  private firestore = inject(Firestore);
  private router = inject(Router);

  events: any[] = [];
  registrations: any[] = [];
  openRosterId: string | null = null;
  userProfiles: { [uid: string]: string } = {};

  constructor() {
    addIcons({
      calendarOutline, createOutline, trashOutline,
      locationOutline, timeOutline
    });
  }

  ngOnInit() {
    // load events
    const eventsCol = collection(this.firestore, 'events');
    collectionData(eventsCol, { idField: 'id' }).subscribe((data: any[]) => {
      const now = new Date();
      this.events = data.map((val: any) => {
        const end = new Date(val.endTime);
        return {
          ...val,
          status: val.isDraft ? 'Draft' : end < now ? 'Completed' : 'Upcoming'
        };
      });
    });

    // load registrations + fetch each user's profile image
    const regsCol = collection(this.firestore, 'registrations');
    collectionData(regsCol, { idField: 'id' }).subscribe(async (data: any[]) => {
      this.registrations = data;

      // fetch profile images for all unique users
      const uniqueUserIds = [...new Set(data.map(r => r.userId).filter(Boolean))];
      for (const uid of uniqueUserIds) {
        if (!this.userProfiles[uid]) {
          try {
            const userDoc = await getDoc(doc(this.firestore, 'users', uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              this.userProfiles[uid] = userData['profileImage'] || '';
            }
          } catch (e) {
            this.userProfiles[uid] = '';
          }
        }
      }
    });
  }

  getRegistrationCount(eventId: string): number {
    return this.registrations.filter(r => r.eventId === eventId).length;
  }

  getFirstRegistrations(eventId: string): any[] {
    return this.registrations
      .filter(r => r.eventId === eventId)
      .slice(0, 3);
  }

  getUserImage(userId: string): string {
    return this.userProfiles[userId] || '';
  }

  isLive(event: any): boolean {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  }

  editEvent(event: any) {
    this.router.navigate(['/admin-dashboard/create'], {
      state: { event }
    });
  }

  async deleteEvent(id: string) {
    await deleteDoc(doc(this.firestore, `events/${id}`));
  }

  toggleRoster(eventId: string) {
    this.openRosterId = this.openRosterId === eventId ? null : eventId;
  }

  getRegistrations(eventId: string): any[] {
    return this.registrations.filter(r => r.eventId === eventId);
  }
}