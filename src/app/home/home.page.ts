// home.page.ts
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, calendarOutline, notificationsOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class HomePage {
  constructor() {
    addIcons({ homeOutline, calendarOutline, notificationsOutline, personOutline });
  }
}