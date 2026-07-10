import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Site } from '../models/Site.model';

@Injectable({
  providedIn: 'root',
})
export class SiteService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/sites`;
  private options = { withCredentials: true };

  /**
   * Créer un site
   * Omit exclut les champs générés par le backend (id, code, etc.)
   */
  create(data: Partial<Site>): Observable<{ success: boolean; data: Site }> {
    return this.http.post<{ success: boolean; data: Site }>(this.baseUrl, data, this.options);
  }

  getAll(): Observable<{ success: boolean; data: Site[] }> {
    return this.http.get<{ success: boolean; data: Site[] }>(this.baseUrl, this.options);
  }

  getOne(id: string): Observable<{ success: boolean; data: Site }> {
    return this.http.get<{ success: boolean; data: Site }>(`${this.baseUrl}/${id}`, this.options);
  }

  /**
   * Mettre à jour un site
   * Partial autorise l'envoi de seulement certains champs
   */
  update(id: string, data: Partial<Site>): Observable<{ success: boolean; data: Site }> {
    return this.http.put<{ success: boolean; data: Site }>(
      `${this.baseUrl}/${id}`,
      data,
      this.options,
    );
  }

  toggleStatus(id: string): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.patch<{ success: boolean; message: string; data: any }>(
      `${this.baseUrl}/${id}/toggle-status`,
      {},
      this.options,
    );
  }
}
