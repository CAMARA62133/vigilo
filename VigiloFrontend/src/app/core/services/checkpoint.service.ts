// core/services/api/checkpoint.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Checkpoint } from '../models/Checkpoint.model';

@Injectable({
  providedIn: 'root',
})
export class CheckpointService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/checkpoints`;
  private options = { withCredentials: true };

  /**
   * Créer un checkpoint (admin)
   */
  create(data: Partial<Checkpoint>): Observable<{ success: boolean; data: Checkpoint }> {
    return this.http.post<{ success: boolean; data: Checkpoint }>(this.baseUrl, data, this.options);
  }

  /**
   * Récupérer les checkpoints d'un site
   */
  getBySite(siteId: string): Observable<{ success: boolean; data: Checkpoint[] }> {
    return this.http.get<{ success: boolean; data: Checkpoint[] }>(
      `${this.baseUrl}/site/${siteId}`,
      this.options,
    );
  }

  /**
   * Mettre à jour un checkpoint (admin)
   */
  update(
    id: string,
    data: Partial<Checkpoint>,
  ): Observable<{ success: boolean; data: Checkpoint }> {
    return this.http.put<{ success: boolean; data: Checkpoint }>(
      `${this.baseUrl}/${id}`,
      data,
      this.options,
    );
  }

  /**
   * Basculer l'état (isActive) du checkpoint (admin)
   */
  toggleStatus(id: string): Observable<{ success: boolean; message: string; data: Checkpoint }> {
    return this.http.patch<{ success: boolean; message: string; data: Checkpoint }>(
      `${this.baseUrl}/${id}/toggle`,
      {},
      this.options,
    );
  }
}
