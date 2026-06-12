import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, collectionData } from '@angular/fire/firestore';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, cameraOutline, pencilOutline,
  logOutOutline, shieldCheckmarkOutline, lockClosedOutline
} from 'ionicons/icons';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonInput
  ]
})
export class ProfilePage {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private dataStreamSub?: Subscription;

  userData: any = {
    fullName: '',
    email: '',
    phoneNumber: '',
    isVerified: false,
    createdAt: null
  };

  profileImage = '';
  editing = '';
  totalJoined = 0;
  totalUnjoined = 0; 

  constructor() {
    addIcons({
      personOutline, cameraOutline, pencilOutline,
      logOutOutline, shieldCheckmarkOutline, lockClosedOutline
    });
  }

  async ionViewWillEnter() {
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.userData.email = user.email || '';

    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
      if (userDoc.exists()) {
        this.userData = userDoc.data();
        if (!this.userData.email) {
          this.userData.email = user.email || '';
        }
        this.profileImage = this.userData.profileImage || '';
      }

      this.unsubscribeStreams();

      // 1. Get user's active registrations
      const regsCol = collection(this.firestore, 'registrations');
      const regsQuery = query(regsCol, where('userId', '==', user.uid));

      // 2. Get all upcoming, visible campus events (Matching Admin criteria)
      const eventsCol = collection(this.firestore, 'events');
      const upcomingEventsQuery = query(eventsCol, where('status', '==', 'Upcoming'));

      // Listen to both streams simultaneously
      this.dataStreamSub = combineLatest([
        collectionData(regsQuery),
        collectionData(upcomingEventsQuery)
      ]).subscribe({
        next: ([regs, upcomingEvents]) => {
          const now = new Date();
          
          // Count active event registrations safely
          this.totalJoined = regs ? regs.length : 0;

          // Double check filter to get only real, non-draft upcoming events
          const validUpcomingEvents = (upcomingEvents || []).filter((e: any) => {
            const end = new Date(e.endTime);
            return !e.isDraft && end >= now;
          });

          // Math: Total Events available minus the ones the user joined
          const calculation = validUpcomingEvents.length - this.totalJoined;
          this.totalUnjoined = calculation > 0 ? calculation : 0;
        },
        error: (err) => console.error("Error updating account metrics stream:", err)
      });

    } catch (error) {
      console.error("Profile loading breakdown:", error);
    }
  }

  ionViewLeave() {
    this.unsubscribeStreams();
  }

  private unsubscribeStreams() {
    if (this.dataStreamSub) {
      this.dataStreamSub.unsubscribe();
    }
  }

  startEdit(field: string) {
    this.editing = field;
  }

  async stopEdit() {
    this.editing = '';
    await this.saveProfile();
  }

  async saveProfile() {
    const user = this.auth.currentUser;
    if (user) {
      await updateDoc(doc(this.firestore, 'users', user.uid), {
        fullName: this.userData.fullName,
        phoneNumber: this.userData.phoneNumber,
        profileImage: this.profileImage
      });
    }
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImage = e.target.result;
        this.saveProfile();
      };
      reader.readAsDataURL(file);
    }
  }

  async logout() {
    this.unsubscribeStreams();
    await signOut(this.auth);
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }
}