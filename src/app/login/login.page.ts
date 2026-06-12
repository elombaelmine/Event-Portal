import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { lockClosedOutline, mailOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { environment } from 'src/environments/environment';
import { sendPasswordResetEmail } from '@angular/fire/auth'; // Ensure this is imported at the top

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule]
})
export class LoginPage implements OnInit {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private http = inject(HttpClient); 

  email: string = '';
  password: string = '';
  showPasswordState: boolean = false;

  constructor() {
    addIcons({ mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  ngOnInit() {}

  togglePasswordVisibility() {
    this.showPasswordState = !this.showPasswordState;
  }

  async login() {
    const cleanEmail = this.email?.trim();
    const cleanPassword = this.password;

    console.log("Attempting login with:", `"${cleanEmail}"`);

    if (!cleanEmail || !cleanPassword) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      const creds = await signInWithEmailAndPassword(this.auth, cleanEmail, cleanPassword);
      const user = creds.user;

      const userDocRef = doc(this.firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isVerified = userData?.['isVerified'];
        const role = userData?.['role'];

        if (isVerified === true) {
          role === 'admin' 
            ? this.router.navigate(['/admin-dashboard']) 
            : this.router.navigate(['/home']);
        } else {
          alert("Account not verified. Redirecting to verification page.");
          
          const rawUid = user.uid;
          await signOut(this.auth);

          this.router.navigate(['/otp'], {
            queryParams: { email: cleanEmail, uid: rawUid }
          });
        }
      } else {
        alert("Account record data could not be verified in our records.");
      }
    } catch (error: any) {
      console.error("Login error details:", error);
      alert("Login failed: " + error.message);
    }
  }

  // Option 2: Standard Firebase Secure Link Flow
  async forgotPassword() {
    const cleanEmail = this.email?.trim();
    if (!cleanEmail) {
      alert("Please enter your email address in the field above to receive a recovery link.");
      return;
    }

    try {
      // Trigger Firebase's official, cryptographically signed link generation and delivery
      await sendPasswordResetEmail(this.auth, cleanEmail);
      
      // Clear alert guiding the user directly to where the mail is stored
      alert(
        `A secure password recovery email has been sent to ${cleanEmail}.\n\n` +
        `⚠️ IMPORTANT: If you do not see it in your Inbox within a minute, please check your SPAM or JUNK folder and click "Report as Not Spam".`
      );

    } catch (error: any) {
      console.error("Password reset failure:", error);
      alert("Error: " + error.message);
    }
  }
}