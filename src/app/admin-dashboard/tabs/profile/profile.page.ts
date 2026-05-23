import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { collection, collectionData } from '@angular/fire/firestore';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, cameraOutline, pencilOutline, logOutOutline } from 'ionicons/icons';

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

  adminEmail = '';
  adminId = '';
  profileImage = '';
  editing = '';
  totalEvents = 0;
  totalRegistrations = 0;

  // Initialized fields matching your console properties exactly
  profile: any = {
    fullName: '', 
    phone: '', 
    email: ''
  };

  // Maps to keys in your user document
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

      // Fetch from your main users collection
      const profileDoc = await getDoc(doc(this.firestore, `users/${user.uid}`));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        // Merge fetched data into our profile object structure
        this.profile = { 
          fullName: data['fullName'] || '',
          phone: data['phone'] || '',
          email: data['email'] || this.adminEmail
        };
        this.profileImage = data['profileImage'] || '';
      }
    }

    // Dynamic subscription streams for card metrics
    collectionData(collection(this.firestore, 'events')).subscribe((data: any[]) => {
      this.totalEvents = data.length;
    });

    collectionData(collection(this.firestore, 'registrations')).subscribe((data: any[]) => {
      this.totalRegistrations = data.length;
    });
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
      // Updates data using merge to avoid blowing away keys like role, isVerified, or createdAt
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
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}