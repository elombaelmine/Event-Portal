import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, doc, updateDoc } from '@angular/fire/firestore';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonInput, IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline, calendarOutline, timeOutline, locationOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonInput, IonTextarea
  ]
})
export class CreatePage implements OnInit {

  private firestore = inject(Firestore);
  private router = inject(Router);

  categories = ['Clubs', 'Academic', 'Social', 'Sports'];
  editingId: string | null = null;

  form = {
    title: '', category: 'Clubs', date: '', time: '',
    endTime: '', location: '', description: '', imageUrl: ''
  };

  constructor() {
    addIcons({ cameraOutline, calendarOutline, timeOutline, locationOutline });
  }

  ngOnInit() {
    const state = history.state;
    if (state && state.event) {
      const event = state.event;
      this.editingId = event.id;
      this.form = {
        title: event.title || '',
        category: event.category || 'Clubs',
        date: event.date || '',
        time: event.time || '',
        endTime: event.endTime || '',
        location: event.location || '',
        description: event.description || '',
        imageUrl: event.imageUrl || ''
      };
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveEvent(isDraft: boolean) {
    if (!this.form.title) {
      alert('Please enter an event title.');
      return;
    }

    const startTime = this.form.date && this.form.time
      ? new Date(`${this.form.date}T${this.form.time}`).toISOString()
      : new Date().toISOString();

    const endTime = this.form.date && this.form.endTime
      ? new Date(`${this.form.date}T${this.form.endTime}`).toISOString()
      : startTime;

    if (this.form.imageUrl?.startsWith('data:')) {
      const sizeKB = Math.round(this.form.imageUrl.length / 1024);
      if (sizeKB > 500) {
        alert(`Image too large (${sizeKB}KB). Use a smaller image.`);
        return;
      }
    }

    const eventData = {
      title: this.form.title,
      category: this.form.category,
      location: this.form.location || '',
      description: this.form.description || '',
      startTime, endTime,
      imageUrl: this.form.imageUrl || '',
      status: isDraft ? 'Draft' : 'Upcoming',
      isDraft,
      date: this.form.date,
      time: this.form.time
    };

    try {
      if (this.editingId) {
        await updateDoc(doc(this.firestore, `events/${this.editingId}`), eventData);
      } else {
        await addDoc(collection(this.firestore, 'events'), eventData);
      }
      alert(isDraft ? 'Draft saved! 📝' : 'Event published! ✅');
      this.resetForm();
      this.router.navigate(['/admin-dashboard/event']);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  resetForm() {
    this.editingId = null;
    this.form = {
      title: '', category: 'Clubs', date: '', time: '',
      endTime: '', location: '', description: '', imageUrl: ''
    };
  }
}