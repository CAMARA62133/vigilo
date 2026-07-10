import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import { WorkSession, GpsPosition } from '../models/Work-session.model';
import { Planning } from '../models/Planning.model';

export interface CheckInResponse {
  success: boolean;
  message: string;

  data: {
    session: WorkSession;
    planning: Planning;
  };
}

@Injectable({
  providedIn: 'root',
})
export class WorkSessionService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.apiUrl}/work-sessions`;

  private options = {
    withCredentials: true,
  };

  /**
   * CHECK-IN
   */
  checkIn(data: {
    qrData: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
  }): Observable<CheckInResponse> {
    return this.http.post<CheckInResponse>(`${this.baseUrl}/checkin`, data, this.options);
  }

  /**
   * SEND GPS POSITION
   */
  sendPosition(data: Partial<GpsPosition>): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-position`, data, this.options);
  }

  /**
   * LIVE POSITIONS
   */
  // core/services/work-session.service.ts (ajout)
  getLivePositions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/live-positions`, this.options);
  }
}
