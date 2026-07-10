import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment } from '../models/Payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;

  private httpOptions = { withCredentials: true };



  // ===================== CREATE PAYMENT =====================
  createPayment(data: any): Observable<Payment> {
    return this.http.post<Payment>(this.apiUrl, data, this.httpOptions);
  }

  // ===================== CONFIRM PAYMENT =====================
  confirmPayment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm`, data, this.httpOptions);
  }

  // ===================== GET ALL =====================
  getAll(): Observable<Payment[]> {
    return this.http.get<Payment[]>(this.apiUrl, this.httpOptions);
  }

  // ===================== GET ONE =====================
  getById(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/${id}`, this.httpOptions);
  }
}
