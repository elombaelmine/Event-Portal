import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, collection, collectionData } from '@angular/fire/firestore';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, cameraOutline, pencilOutline, logOutOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';

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
export class ProfilePage implements OnInit {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  private eventsSub?: Subscription;
  private regsSub?: Subscription;

  adminEmail = '';
  adminId = '';
  profileImage = '';
  editing = '';
  totalEvents = 0;
  totalRegistrations = 0;

  profile: any = {
    fullName: '', 
    phone: '', 
    email: ''
  };

  profileFields = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' }
  ];

  constructor() {
    addIcons({ personOutline, cameraOutline, pencilOutline, logOutOutline });
  }

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      this.adminEmail = user.email || '';
      this.adminId = user.uid.slice(0, 6).toUpperCase();

      const profileDoc = await getDoc(doc(this.firestore, `users/${user.uid}`));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        this.profile = { 
          fullName: data['fullName'] || '',
          phone: data['phone'] || '',
          email: data['email'] || this.adminEmail
        };
        this.profileImage = data['profileImage'] || '';
      }
    }

    // 1. Live stream of events
    this.eventsSub = collectionData(collection(this.firestore, 'events')).subscribe((data: any[]) => {
      this.totalEvents = data.length;
    });

    // 2. Live stream of registrations validated against active accounts
    this.regsSub = collectionData(collection(this.firestore, 'registrations')).subscribe(async (data: any[]) => {
      const uniqueUserIds = [...new Set(data.map(r => r.userId).filter(Boolean))];
      const existingUserIds = new Set<string>();

      // Cross-verify registration users against the real users collection
      for (const uid of uniqueUserIds) {
        try {
          const userDoc = await getDoc(doc(this.firestore, 'users', uid));
          if (userDoc.exists()) {
            existingUserIds.add(uid);
          }
        } catch (e) {
          console.error(`Error validating user account profile: ${uid}`, e);
        }
      }

      // Only count registration documents where the user actually exists in the database
      const validRegistrations = data.filter(r => r && r.userId && existingUserIds.has(r.userId));
      this.totalRegistrations = validRegistrations.length;
    });
  }

  ngOnDestroy() {
    this.unsubscribeStreams();
  }

  private unsubscribeStreams() {
    if (this.eventsSub) this.eventsSub.unsubscribe();
    if (this.regsSub) this.regsSub.unsubscribe();
  }

  startEdit(field: string) { 
    this.editing = field; 
  }

  stopEdit() {
    this.editing = '';
    this.saveProfile();
  }

  async saveProfile() {
    const user = this.auth.currentUser;
    if (user) {
      await setDoc(doc(this.firestore, `users/${user.uid}`), {
        fullName: this.profile.fullName,
        phone: this.profile.phone,
        profileImage: this.profileImage
      }, { merge: true });
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