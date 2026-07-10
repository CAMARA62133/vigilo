import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company } from '../models/Company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/companies`;
  private httpOptions = { withCredentials: true };

  // ================= CREATE =================
  // Utilisation de FormData car le backend utilise multer (upload.fields)
  createCompany(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData, this.httpOptions);
  }

  // ================= UPDATE =================
  // Même logique : patch avec FormData pour permettre l'envoi de fichiers
  updateCompany(id: string, formData: FormData): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, formData, this.httpOptions);
  }

  // ================= GET ALL =================
  getAll(): Observable<{ success: boolean; data: Company[] }> {
    return this.http.get<{ success: boolean; data: Company[] }>(this.apiUrl, this.httpOptions);
  }

  // ================= GET BY ID =================
  getById(id: string): Observable<{ success: boolean; data: Company }> {
    return this.http.get<{ success: boolean; data: Company }>(
      `${this.apiUrl}/${id}`,
      this.httpOptions,
    );
  }

  // ================= VALIDATE COMPANY =================
  validate(id: string, action: 'accept' | 'reject', motif?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/validate/${id}`, { action, motif }, this.httpOptions);
  }

  // ================= TOGGLE ACTIVE =================
  // Correspond à votre route : router.patch("/companies/:id/toggle-active")
  // Note : Si votre prefix est déjà /companies, l'URL finale est /companies/:id/toggle-active
  toggleActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-active`, {}, this.httpOptions);
  }
}
