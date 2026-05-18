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

  profile: any = {
    fullName: '', phone: '', email: ''
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

      // load profile
      const profileDoc = await getDoc(doc(this.firestore, `admins/${user.uid}`));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        this.profile = { ...this.profile, ...data };
        this.profileImage = data['profileImage'] || '';
      }
    }

    // load stats
    collectionData(collection(this.firestore, 'events')).subscribe((data: any[]) => {
      this.totalEvents = data.length;
    });

    collectionData(collection(this.firestore, 'registrations')).subscribe((data: any[]) => {
      this.totalRegistrations = data.length;
    });
  }

  startEdit(field: string) { this.editing = field; }

  stopEdit() {
    this.editing = '';
    this.saveProfile();
  }

  async saveProfile() {
    const user = this.auth.currentUser;
    if (user) {
      await setDoc(doc(this.firestore, `admins/${user.uid}`), {
        ...this.profile,
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
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}