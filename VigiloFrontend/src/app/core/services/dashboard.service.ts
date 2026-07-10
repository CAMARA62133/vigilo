// src/app/services/dashboard.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  // ======================================================
  // 🔥 INJECTION
  // ======================================================

  private readonly http = inject(HttpClient);

  // ======================================================
  // 🌐 API URL
  // ======================================================

  private readonly apiUrl = `${environment.apiUrl}/dashboards`;

  // ======================================================
  // 📊 GET DASHBOARD STATS
  // ======================================================

  getStats(period: 'day'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`, {
      params: {
        period,
      },
      withCredentials: true,
    });
  }
}
