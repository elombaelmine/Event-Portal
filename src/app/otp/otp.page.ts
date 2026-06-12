import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline } from 'ionicons/icons';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule]
})
export class OTPPage implements OnInit {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // Injected to read query data parameters

  // Hold extracted parameters securely
  userUid: string = '';
  userEmail: string = '';

  // Use an array to hold each individual digit
  otpArray: string[] = ['', '', '', '', '', '']; 

  constructor() { 
    addIcons({ shieldCheckmarkOutline });
  }

  ngOnInit() {
    // Extract parameters passed from the registration page securely
    this.route.queryParams.subscribe(params => {
      if (params['uid']) {
        this.userUid = params['uid'];
      }
      if (params['email']) {
        this.userEmail = params['email'];
      }
    });
  }

  async verifyAndRedirect() {
    // 1. Combine array and forcefully strip spaces or non-numeric formatting characters
    const enteredCode = this.otpArray.join('').trim().replace(/\D/g, '');

    // Check against the parameter variable instead of a broken auth session
    if (!this.userUid) {
      alert("Verification context lost. Please try logging in or signing up again.");
      this.router.navigate(['/login']);
      return;
    }

    if (enteredCode.length < 6) {
      alert("Please enter the full 6-digit code.");
      return;
    }

    try {
      // Find the document directly in the Firestore user collection using the extracted uid
      const userDocRef = doc(this.firestore, 'users', this.userUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const storedOtp = String(userDoc.data()['otpCode']).trim().replace(/\D/g, ''); 

        if (enteredCode === storedOtp) {
          // 1. Update verification status in Firestore
          await updateDoc(userDocRef, { 
            isVerified: true,
            otpCode: null // Clear the code so it cannot be reused
          });
          
          // 2. Success Alert
          alert("Email verified successfully! Please log in with your credentials.");
          
          // 3. Direct redirect to Login page
          this.router.navigate(['/login']); 
        } else {
          alert("Invalid 6-digit code. Please check your email.");
        }
      } else {
        alert("Account database entry not found.");
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      alert("Error: " + error.message);
    }
  }

  // Focus transition helper logic
  moveFocus(event: any, nextElement?: any) {
    if (event.target.value.length === 1 && nextElement) {
      nextElement.setFocus();
    }
  }
}