import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline } from 'ionicons/icons';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule]
})
export class OTPPage implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // Use an array to hold each individual digit
  otpArray: string[] = ['', '', '', '', '', '']; 

  constructor() { 
    addIcons({ shieldCheckmarkOutline });
  }

  async verifyAndRedirect() {
    const user = this.auth.currentUser;
    
    // Combine the array into a single string for comparison
    const enteredCode = this.otpArray.join('');

    if (!user) {
      alert("Session expired. Please sign up again.");
      this.router.navigate(['/sign-up']);
      return;
    }

    if (enteredCode.length < 6) {
      alert("Please enter the full 6-digit code.");
      return;
    }

    try {
      const userDocRef = doc(this.firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Force both to strings to avoid type-mismatch (Number vs String)
        const storedOtp = String(userDoc.data()['otpCode']); 

        if (enteredCode === storedOtp) {
          // 1. Update verification status in Firestore
          await updateDoc(userDocRef, { 
            isVerified: true,
            otpCode: null // Clear the code so it can't be used again
          });
          
          // 2. Success Alert (No mention of links)
          alert("Email verified successfully! Please log in with your credentials.");
          
          // 3. Direct redirect to Login page
          this.router.navigate(['/login']); 
        } else {
          alert("Invalid 6-digit code. Please check your email.");
        }
      } else {
        alert("Account data not found.");
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      alert("Error: " + error.message);
    }
  }

  // Improved focus helper
  moveFocus(event: any, nextElement?: any) {
    if (event.target.value.length === 1 && nextElement) {
      nextElement.setFocus();
    }
  }

  ngOnInit() {}
}