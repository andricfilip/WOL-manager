import { Routes } from '@angular/router';
import { authGuard, adminGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent)
  },
  {
    path: 'statistics',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/statistics/statistics.component').then(m => m.StatisticsComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    children: [
      { path: '', redirectTo: 'computers', pathMatch: 'full' },
      {
        path: 'computers',
        loadComponent: () => import('./pages/admin/computers/admin-computers.component').then(m => m.AdminComputersComponent)
      },
      {
        path: 'computers/add',
        loadComponent: () => import('./pages/admin/computers/admin-computer-form.component').then(m => m.AdminComputerFormComponent)
      },
      {
        path: 'computers/:id/edit',
        loadComponent: () => import('./pages/admin/computers/admin-computer-form.component').then(m => m.AdminComputerFormComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'groups',
        loadComponent: () => import('./pages/admin/groups/admin-groups.component').then(m => m.AdminGroupsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
