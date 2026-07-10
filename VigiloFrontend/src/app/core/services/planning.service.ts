import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Planning, PlanningStatus } from '../models/Planning.model';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/plannings`;
  private readonly httpOptions = { withCredentials: true };

  create(data: Partial<Planning>): Observable<{ success: boolean; data: Planning }> {
    return this.http.post<{ success: boolean; data: Planning }>(
      this.baseUrl,
      data,
      this.httpOptions,
    );
  }

  // Corrigé pour inclure les filtres de recherche (datePreset, agentId, siteId, etc.)
  getAll(filters?: {
    datePreset?: 'today' | 'week' | 'month' | 'custom';
    startDate?: string;
    endDate?: string;
    agentId?: string;
    siteId?: string;
    status?: PlanningStatus;
  }): Observable<{ success: boolean; data: Planning[]; stats: any }> {
    let params = new HttpParams();

    if (filters) {
      // On boucle sur les entrées pour éviter l'indexation par string pure
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.append(key, value.toString());
        }
      });
    }

    return this.http.get<{ success: boolean; data: Planning[]; stats: any }>(this.baseUrl, {
      ...this.httpOptions,
      params,
    });
  }

  getOne(id: string): Observable<{ success: boolean; data: Planning }> {
    return this.http.get<{ success: boolean; data: Planning }>(
      `${this.baseUrl}/${id}`,
      this.httpOptions,
    );
  }

  update(id: string, data: Partial<Planning>): Observable<{ success: boolean; data: Planning }> {
    return this.http.put<{ success: boolean; data: Planning }>(
      `${this.baseUrl}/${id}`,
      data,
      this.httpOptions,
    );
  }

  cancel(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/${id}/cancel`,
      {},
      this.httpOptions,
    );
  }
}
