import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agent } from '../models/Agent.model';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/agents`;
  private httpOptions = { withCredentials: true };

  // ================= CREATE =================
  // Attention: FormData requis pour les fichiers photoProfile et identityDocument
  createAgent(
    formData: FormData,
  ): Observable<{ success: boolean; data: { user: any; agent: Agent } }> {
    return this.http.post<{ success: boolean; data: { user: any; agent: Agent } }>(
      this.apiUrl,
      formData,
      this.httpOptions,
    );
  }

  // ================= UPDATE =================
  // Votre route est en PUT dans le router
  updateAgent(id: string, formData: FormData): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.apiUrl}/${id}`,
      formData,
      this.httpOptions,
    );
  }

  // ================= GET ALL =================
  getAll(): Observable<{ success: boolean; data: Agent[] }> {
    return this.http.get<{ success: boolean; data: Agent[] }>(this.apiUrl, this.httpOptions);
  }

  // ================= GET BY ID =================
  getById(id: string): Observable<{ success: boolean; data: Agent }> {
    return this.http.get<{ success: boolean; data: Agent }>(
      `${this.apiUrl}/${id}`,
      this.httpOptions,
    );
  }
}
