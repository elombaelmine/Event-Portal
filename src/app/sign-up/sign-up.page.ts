import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
 import { lockClosedOutline, mailOutline, peopleOutline, personOutline } from 'ionicons/icons';
 import { Auth, createUserWithEmailAndPassword, sendEmailVerification } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: true,
  imports: [IonicModule,CommonModule,RouterModule,FormsModule],
})
export class SignUpPage implements OnInit {
  
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject (Router);
  private http = inject(HttpClient);

  email: string = '';
  password: string = '';
   
  async submitSignup() {
  console.log("Input Email:", this.email);
  
  const cleanEmail = this.email ? this.email.trim() : '';
  const cleanPassword = this.password ? this.password.trim() : '';

  if (!cleanEmail || !cleanPassword) {
    alert("Please fill in both email and password before registering.");
    return;
  }

  // 1. Generate the 6-digit code BEFORE creating the user
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // 2. Create the user in Firebase Auth
    const creds = await createUserWithEmailAndPassword(this.auth, cleanEmail, cleanPassword);
    
    // 3. Save to Firestore (Including the otpCode!)
    await setDoc(doc(this.firestore, 'users', creds.user.uid), {
      email: cleanEmail,
      role: 'user', 
      otpCode: generatedOtp, // Crucial for the OTP page verification
      isVerified: false,
      createdAt: new Date()
    });

    // 4. Send the Email via Brevo API
    const brevoUrl = environment.BREVO_API_URL
    const apiKey = environment.BREVO_API_KEY

    const emailBody = {
      sender: { name: "IUSJC Event Portal", email: "eventportal0@gmail.com" }, // <--- Your Brevo verified email
      to: [{ email: cleanEmail }],
      subject: "Your Campus Portal Verification Code",
      htmlContent: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>Welcome to the IUSJC Event Portal!</h2>
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

    // 5. Execute the HTTP request and redirect
    this.http.post(brevoUrl, emailBody, { headers }).subscribe({
      next: () => {
        console.log("Code sent to Brevo successfully!");
        this.router.navigate(['/otp']); 
      },
      error: (err: any) => {
        console.error("Brevo API Error:", err);
        alert("Account created, but email failed. Check your API key and verified sender.");
      }
    });

  } catch (error: any) {
    alert("Signup Error: " + error.message);
  }
}

  constructor( router: Router) {
  addIcons({
   personOutline,mailOutline, 
   peopleOutline,lockClosedOutline
  });
  }

  ngOnInit() {
  }
 
}
