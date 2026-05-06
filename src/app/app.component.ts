import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
// Import the specific icons you are using
import { addIcons } from 'ionicons';
import { homeOutline, calendarOutline, notificationsOutline, personCircleOutline, listOutline, addCircleOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  isAdmin = false;

  constructor() {
    // Register the icons here
    // addIcons({ 
    //   homeOutline, 
    //   calendarOutline, 
    //   notificationsOutline, 
    //   personCircleOutline, 
    //   listOutline, 
    //   addCircleOutline, 
    //   personOutline,
    // });
  }
}