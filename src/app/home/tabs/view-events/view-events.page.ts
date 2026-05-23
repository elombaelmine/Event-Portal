import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { personCircleOutline, searchOutline, calendarOutline, locationOutline, timeOutline } from 'ionicons/icons';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-view-events',
  templateUrl: './view-events.page.html',
  styleUrls: ['./view-events.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ViewEventsPage implements OnInit {
  private firestore = inject(Firestore);

  events$!: Observable<any[]>;
  searchQuery: string = '';

  constructor() {
    addIcons({ 
      personCircleOutline, 
      searchOutline, 
      calendarOutline, 
      locationOutline, 
      timeOutline 
    });
  }

  ngOnInit() {
    const eventsCollection = collection(this.firestore, 'events');
    
    // Fetch live stream and filter out drafts so students only see published work
    this.events$ = collectionData(eventsCollection, { idField: 'id' }).pipe(
      map((events: any[]) => 
        events.filter(event => event.status === 'Upcoming' && !event.isDraft)
      )
    );
  }

  registerForEvent(eventItem: any) {
    console.log("Student registering for event ID:", eventItem.id);
    // Future registration link logic goes here
  }
}