import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Plan } from '../models/Plan.model';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/plans`;

  private httpOptions = { withCredentials: true };

  // ===================== PUBLIC PLANS =====================
  getPublicPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.apiUrl}/public`);
  }

  // ===================== GET ALL =====================
  getAll(): Observable<{ success: boolean; data: Plan[] }> {
    return this.http.get<{ success: boolean; data: Plan[] }>(this.apiUrl, this.httpOptions);
  }

  // ===================== GET BY ID =====================
  getById(id: string): Observable<Plan> {
    return this.http.get<Plan>(`${this.apiUrl}/${id}`, this.httpOptions);
  }

  // ===================== CREATE =====================
  create(data: Partial<Plan>): Observable<Plan> {
    return this.http.post<Plan>(this.apiUrl, data, this.httpOptions);
  }

  // ===================== UPDATE =====================
  update(id: string, data: Partial<Plan>): Observable<Plan> {
    return this.http.patch<Plan>(`${this.apiUrl}/${id}`, data, this.httpOptions);
  }

  // ===================== TOGGLE STATUS =====================
  toggleStatus(id: string): Observable<Plan> {
    return this.http.patch<Plan>(`${this.apiUrl}/${id}/toggle-status`, {}, this.httpOptions);
  }
}
