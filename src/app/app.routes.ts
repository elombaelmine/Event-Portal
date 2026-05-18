import { Routes } from '@angular/router';

export const routes: Routes = [
  // 1. Core Auth & Onboarding Flow
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'welcome',
    loadComponent: () => import('./welcome/welcome.page').then(m => m.WelcomePage)
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./sign-up/sign-up.page').then(m => m.SignUpPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'otp',
    loadComponent: () => import('./otp/otp.page').then(m => m.OTPPage)
  },

  // 2. Student User Dashboard (With Nested Bottom Tabs)
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    children: [
      {
        path: 'view-events',
        loadComponent: () => import('./home/tabs/view-events/view-events.page').then(m => m.ViewEventsPage)
      },
      {
        path: 'calender',
        loadComponent: () => import('./home/tabs/calender/calender.page').then(m => m.CalenderPage)
      },
      {
        path: 'alert',
        loadComponent: () => import('./home/tabs/alert/alert.page').then(m => m.AlertPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./home/tabs/profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: '',
        redirectTo: 'view-events',
        pathMatch: 'full'
      }
    ]
  },

  // 3. Admin Dashboard (With Nested Tabs for Admin Duties)
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage),
    children: [
      {
        path: 'event',
        loadComponent: () => import('./admin-dashboard/tabs/event/event.page').then(m => m.EventPage)
      },
      {
        path: 'create',
        loadComponent: () => import('./admin-dashboard/tabs/create/create.page').then(m => m.CreatePage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./admin-dashboard/tabs/profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: '',
        redirectTo: 'event',
        pathMatch: 'full'
      }
    ]
  }
];