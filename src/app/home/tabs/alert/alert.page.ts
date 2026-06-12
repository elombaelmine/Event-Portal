import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { Firestore, collection, collectionData, query, where, doc, docData, updateDoc, serverTimestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Subscription, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { trashOutline, notificationsOutline } from 'ionicons/icons';

interface CampusAlert {
  id: string;
  category: string;
  title: string;
  message: string;
  isUrgent: boolean;
  time: Date;
}

@Component({
  selector: 'app-alert',
  templateUrl: './alert.page.html',
  styleUrls: ['./alert.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, IonButtons, IonBackButton, CommonModule, FormsModule]
})
export class AlertPage implements OnInit, OnDestroy {

  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  alerts: CampusAlert[] = [];
  private dataSubscription!: Subscription;

  constructor() {
    addIcons({ trashOutline, notificationsOutline });
  }

  ngOnInit() {
    const user = this.auth.currentUser;
    if (!user) return;

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    
    this.dataSubscription = docData(userDocRef).pipe(
      switchMap((userProfile: any) => {
        const clearedAtTime = userProfile?.['notificationsClearedAt'] ? userProfile['notificationsClearedAt'].toDate() : null;

        // Listen directly to the persistent notification ledger logs for this specific student
        const notificationsCollection = collection(this.firestore, 'notifications');
        const userNotifsQuery = query(notificationsCollection, where('userId', '==', user.uid));
        
        const eventsCollection = collection(this.firestore, 'events');
        const upcomingEventsQuery = query(eventsCollection, where('status', '==', 'Upcoming'));

        return combineLatest([
          collectionData(userNotifsQuery, { idField: 'id' }),
          collectionData(upcomingEventsQuery, { idField: 'id' }),
          of(clearedAtTime)
        ]);
      })
    ).subscribe({
      next: ([loggedNotifications, events, clearedAtTime]) => {
        const uniqueAlertsMap = new Map<string, CampusAlert>();
        const now = new Date();

        const isNotificationValid = (notificationTime: Date) => {
          if (!clearedAtTime) return true;
          return notificationTime.getTime() > clearedAtTime.getTime();
        };

        // --- SOURCE A: Process Permanent Logged Notifications (Joins & Leaves!) ---
        const safeLogs = loggedNotifications || [];
        safeLogs.forEach((log: any) => {
          if (!log) return;
          const logTime = log['createdAt'] ? new Date(log['createdAt']) : new Date();

          if (isNotificationValid(logTime)) {
            uniqueAlertsMap.set(log.id, {
              id: log.id,
              category: log['category'] || 'Notice',
              title: log['title'] || 'Alert',
              message: log['message'] || '',
              isUrgent: log['isUrgent'] || false,
              time: logTime
            });
          }
        });

        // --- SOURCE B: 24-Hour Imminent Start Reminders ---
        const safeEvents = events || [];
        safeEvents.forEach((event: any) => {
          if (event && event['startTime'] && isNotificationValid(now)) {
            const eventStart = new Date(event['startTime']);
            const diffHours = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

            // If the upcoming bulletin starts within 24 hours, generate a dynamic reminder alert
            if (diffHours > 0 && diffHours <= 24) {
              const reminderId = event['id'] + '_imminent_reminder';
              uniqueAlertsMap.set(reminderId, {
                id: reminderId,
                category: 'Urgent Reminder',
                title: '⏰ Event Commencing Tomorrow!',
                message: `"${event['title'] || 'An event'}" is scheduled to start in less than 24 hours.`,
                isUrgent: true,
                time: now
              });
            }
          }
        });
        
        this.alerts = Array.from(uniqueAlertsMap.values())
          .sort((a, b) => b.time.getTime() - a.time.getTime());
      },
      error: (err) => console.error("Error synchronizing alert stream calculations:", err)
    });
  }

  async clearAllAlerts() {
    const user = this.auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        await updateDoc(userDocRef, {
          notificationsClearedAt: serverTimestamp()
        });
        this.alerts = [];
      } catch (err) {
        console.error("Failed to execute global notifications clearance transaction:", err);
      }
    }
  }

  ngOnDestroy() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }
}