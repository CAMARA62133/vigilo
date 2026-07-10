import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Log } from '../models/Log.model';


@Injectable({ providedIn: 'root' })
export class LogService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/logs`;

  private httpOptions = { withCredentials: true };

  // ===================== STATS =====================
  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`, this.httpOptions);
  }

  // ===================== CREATE LOG =====================
  createLog(data: any): Observable<Log> {
    return this.http.post<Log>(this.apiUrl, data, this.httpOptions);
  }

  // ===================== GET ALL LOGS =====================
  getAll(): Observable<Log[]> {
    return this.http.get<Log[]>(this.apiUrl, this.httpOptions);
  }
}
