// admin-dashboard.page.ts
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
// Changed to standard outline variants to be safe
import { listOutline, addCircleOutline, personCircleOutline } from 'ionicons/icons'; 

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class AdminDashboardPage {
  constructor() {
    // Registering the safe outline shapes
    addIcons({ 
      'list-box-outline': listOutline, 
      'add-circle-outline': addCircleOutline, 
      'shield-checkmark-outline': personCircleOutline 
    });
  }
}