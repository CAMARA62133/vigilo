import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isAuthenticated = signal(false);
  user = signal<User | null>(null);
  isLoading = signal(true);

  private apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);
  private router = inject(Router);

  private inactivityTimer: any;
  private readonly INACTIVITY_LIMIT = 15 * 60 * 1000;

  // ================= LOGIN =================
  login(data: { email: string; password: string }) {
    return this.http
      .post<any>(`${this.apiUrl}/login`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          const user = res.data.user;

          this.isAuthenticated.set(true);
          this.user.set(user);
          this.isLoading.set(false);

          // 🔥 IMPORTANT: check mustChangePassword
          if (user.mustChangePassword) {
            this.router.navigate(['/auth/force-change-password']);
            return;
          }

          this.resetInactivityTimer();
        }),
      );
  }

  // ================= CHECK AUTH =================
  checkAuth() {
    this.http
      .get<any>(`${this.apiUrl}/profile`, {
        withCredentials: true,
      })
      .subscribe({
        next: (res) => {
          const user = res.data.user;

          this.isAuthenticated.set(true);
          this.user.set(user);
          this.isLoading.set(false);

          //  force password change guard
          if (user.mustChangePassword) {
            this.router.navigate(['/auth/force-change-password']);
            return;
          }

          this.resetInactivityTimer();
        },
        error: () => this.clearAuthState(),
      });
  }

  // ================= LOGOUT =================
  logout() {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout(),
    });
  }

  private finalizeLogout() {
    this.clearAuthState();
    this.router.navigate(['/login']);
  }

  clearAuthState() {
    this.isAuthenticated.set(false);
    this.user.set(null);
    this.isLoading.set(false);
    this.stopInactivityTimer();
  }

  // ================= PROFILE =================
  updateProfile(data: FormData): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/profile`, data, {
      withCredentials: true,
    });
  }

  // ================= CHANGE PASSWORD =================
  changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.http.patch(`${this.apiUrl}/change-password`, data, { withCredentials: true });
  }

  // ================= FORCE CHANGE PASSWORD =================
  forceChangePassword(data: { email: string; newPassword: string }) {
    return this.http
      .post<any>(`${this.apiUrl}/force-change-password`, data, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res?.success) {
            const user = this.user();

            if (user) {
              this.user.set({
                ...user,
                mustChangePassword: false,
              });
            }
          }
        }),
      );
  }

  // ================= FORGOT PASSWORD =================
  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email }, { withCredentials: true });
  }

  // ================= VERIFY CODE =================
  verifyResetCode(data: { email: string; code: string }) {
    return this.http.post(`${this.apiUrl}/verify-code`, data, { withCredentials: true });
  }

  // ================= RESET PASSWORD =================
  resetPassword(data: { email: string; code: string; newPassword: string }) {
    return this.http.post(`${this.apiUrl}/reset-password`, data, { withCredentials: true });
  }

  // ================= RESEND RESET LINK =================
  resendResetLink(email: string) {
    return this.http.post(`${this.apiUrl}/resend-reset-link`, { email }, { withCredentials: true });
  }

  // ================= ROLE CHECK =================
  hasRole(roles: string[]): boolean {
    const currentUser = this.user();
    return !!currentUser && roles.includes(currentUser.role);
  }

  // ================= INACTIVITY =================
  resetInactivityTimer() {
    this.stopInactivityTimer();

    if (this.isAuthenticated()) {
      this.inactivityTimer = setTimeout(() => this.logout(), this.INACTIVITY_LIMIT);
    }
  }

  private stopInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
  }

  // ================= TOGGLE USER ACTIVE =================
  toggleUserActive(userId: string): Observable<any> {
    return this.http
      .patch(`${this.apiUrl}/${userId}/toggle-active`, {}, { withCredentials: true })
      .pipe(
        tap((res: any) => {
          const currentUser = this.user();

          if (currentUser && currentUser.id === userId) {
            this.user.set({
              ...currentUser,
              status: res.data.status,
            });
          }
        }),
      );
  }
}
