import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
 import { addIcons } from 'ionicons';
 import { homeOutline, calendarOutline, notificationsOutline, personCircleOutline, listOutline, addCircleOutline, personOutline, informationCircleOutline, alarmOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [IonicModule,CommonModule,RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WelcomePage implements OnInit {

  constructor() { 
    addIcons({ 
      calendarOutline, 
      personOutline,
      informationCircleOutline,
      alarmOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit() {
  }
  

}
