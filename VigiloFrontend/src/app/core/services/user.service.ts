import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  private readonly httpOptions = {
    withCredentials: true,
  };

  // GET ALL USERS - Le backend renvoie { success: boolean, users: User[] }
  getAllUsers(): Observable<User[]> {
    return this.http
      .get<{ success: boolean; users: User[] }>(this.apiUrl, this.httpOptions)
      .pipe(map((res) => res.users));
  }

  // GET ONE USER - Le backend renvoie { success: boolean, user: User }
  getUserById(id: string): Observable<User> {
    return this.http
      .get<{ success: boolean; user: User }>(`${this.apiUrl}/${id}`, this.httpOptions)
      .pipe(map((res) => res.user));
  }

  // CREATE USER - Le backend renvoie { success: boolean, user: User, ... }
  createUser(data: FormData | Partial<User>): Observable<User> {
    return this.http
      .post<{ success: boolean; user: User }>(this.apiUrl, data, this.httpOptions)
      .pipe(map((res) => res.user));
  }

  // UPDATE USER - Le backend renvoie { success: boolean, user: User, ... }
  updateUser(id: string, data: FormData | Partial<User>): Observable<User> {
    return this.http
      .put<{ success: boolean; user: User }>(`${this.apiUrl}/${id}`, data, this.httpOptions)
      .pipe(map((res) => res.user));
  }
}
