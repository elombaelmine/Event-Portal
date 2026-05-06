import { Component, OnInit,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
 import { addIcons } from 'ionicons';
 import { lockClosedOutline, mailOutline } from 'ionicons/icons';
 import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
 import { Firestore, doc, getDoc } from '@angular/fire/firestore';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule,FormsModule]
})
export class LoginPage implements OnInit {

   // 1. Inject the Firebase tools
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // 2. Declare the properties for your ngModel
  email: string = '';
  password: string = '';

 async login() {
  // Trim the email to remove accidental leading/trailing spaces
  const cleanEmail = this.email?.trim();
  const cleanPassword = this.password;

  console.log("Attempting login with:", `"${cleanEmail}"`); // The quotes help see spaces

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
        alert("Account not verified. Redirecting to OTP.");
        this.router.navigate(['/otp']);
      }
    }
  } catch (error: any) {
    console.error("Login error details:", error);
    // This will now catch if the email is still considered "invalid" by Firebase
    alert("Login failed: " + error.message);
  }
}

  constructor(router: Router) {
    addIcons({
     mailOutline,lockClosedOutline
    })
  }

  ngOnInit() {
  }
}
