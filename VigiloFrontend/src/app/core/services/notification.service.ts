import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notifications } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.apiUrl}/notifications`;
  private options = { withCredentials: true };

  // ======================
  // GET ALL
  // ======================
  getAll(): Observable<{ success: boolean; data: Notifications[] }> {
    return this.http.get<{ success: boolean; data: Notifications[] }>(this.baseUrl, this.options);
  }

  // ======================
  // UNREAD COUNT
  // ======================
  getUnreadCount(): Observable<{ success: boolean; data: { count: number } }> {
    return this.http.get<{ success: boolean; data: { count: number } }>(
      `${this.baseUrl}/unread/count`,
      this.options,
    );
  }

  // ======================
  // MARK ONE AS READ
  // ======================
  markAsRead(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.baseUrl}/${id}/read`,
      {},
      this.options,
    );
  }

  // ======================
  // MARK ALL AS READ
  // ======================
  markAllAsRead(): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.baseUrl}/read-all`,
      {},
      this.options,
    );
  }

  // ======================
  // DELETE ONE NOTIFICATION
  // ======================
  deleteOne(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${id}`,
      this.options,
    );
  }

  // ======================
  // DELETE ALL NOTIFICATIONS
  // ======================
  deleteAll(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(this.baseUrl, this.options);
  }
}
