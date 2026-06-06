import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { lockClosedOutline, mailOutline, peopleOutline, personOutline, callOutline } from 'ionicons/icons';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
// FIXED: Changed from '@angular/fire/http' back to Angular's native common HTTP package
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule],
})
export class SignUpPage implements OnInit {
  
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private http = inject(HttpClient);

  fullName: string = '';
  email: string = '';
  phone: string = '';
  password: string = '';
   
  async submitSignup() {
    const cleanFullName = this.fullName ? this.fullName.trim() : '';
    const cleanEmail = this.email ? this.email.trim() : '';
    const cleanPhone = this.phone ? this.phone.trim() : '';
    const cleanPassword = this.password ? this.password.trim() : '';

    if (!cleanFullName || !cleanEmail || !cleanPhone || !cleanPassword) {
      alert("Please fill in all fields before registering.");
      return;
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Context reference fix
    const databaseContext = this.firestore;

    try {
      // 1. Create user account credentials with Firebase Auth
      const creds = await createUserWithEmailAndPassword(this.auth, cleanEmail, cleanPassword);
      
      // 2. Save profile document using our pre-cached context reference
      const userDocRef = doc(databaseContext, 'users', creds.user.uid);
      await setDoc(userDocRef, {
        fullName: cleanFullName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        role: 'user', 
        otpCode: generatedOtp, 
        isVerified: false,
        createdAt: new Date()
      });

      // 3. Construct Brevo payload
      const brevoUrl = environment.BREVO_API_URL;
      const apiKey = environment.BREVO_API_KEY;

      const emailBody = {
        sender: { name: "IUSJC Event Portal", email: "eventportal0@gmail.com" },
        to: [{ email: cleanEmail }],
        subject: "Your Campus Portal Verification Code",
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2>Welcome to the IUSJC Event Portal, ${cleanFullName}!</h2>
            <p>Your 6-digit verification code is:</p>
            <h1 style="color: #004a99; letter-spacing: 5px;">${generatedOtp}</h1>
            <p>Enter this code in the app to activate your account.</p>
          </div>
        `
      };

      const headers = new HttpHeaders({
        'api-key': apiKey,
        'Content-Type': 'application/json'
      });

      // 4. Send Verification Outbox Payload
      this.http.post(brevoUrl, emailBody, { headers }).subscribe({
        next: () => {
          console.log("Code sent to Brevo successfully!");
          this.router.navigate(['/otp']); 
        },
        error: (err: any) => {
          console.error("Brevo API Error:", err);
          alert("Account created, but verification email failed to send.");
        }
      });

    } catch (error: any) {
      console.error("Signup internal block error:", error);
      alert("Signup Error: " + error.message);
    }
  }

  constructor() {
    addIcons({
      personOutline,
      mailOutline, 
      peopleOutline,
      lockClosedOutline,
      callOutline
    });
  }

  ngOnInit() {}
}