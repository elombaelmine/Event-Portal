import { Component, OnInit, inject } from '@angular/core';
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
  logOutOutline, shieldCheckmarkOutline
} from 'ionicons/icons';

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

  constructor() {
    addIcons({
      personOutline, cameraOutline, pencilOutline,
      logOutOutline, shieldCheckmarkOutline
    });
  }

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // load user data from Firestore
    const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
    if (userDoc.exists()) {
      this.userData = userDoc.data();
      this.profileImage = this.userData.profileImage || '';
    }

    // load total joined events
    const regsCol = collection(this.firestore, 'registrations');
    const q = query(regsCol, where('userId', '==', user.uid));
    collectionData(q).subscribe((regs: any[]) => {
      this.totalJoined = regs.length;
    });
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
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}