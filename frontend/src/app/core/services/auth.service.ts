import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User } from '../models';

const API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = signal(false);

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn.set(true);
      this.loadUser();
    }
  }

  login(email: string, password: string) {
    return this.http.post<{ accessToken: string; user: User }>(`${API}/auth/login`, { email, password }).pipe(
      tap(({ accessToken, user }) => {
        localStorage.setItem('token', accessToken);
        this.user.set(user);
        this.isLoggedIn.set(true);
      }),
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.user.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  loadUser() {
    this.http.get<User>(`${API}/users/me`).subscribe({
      next: (u) => this.user.set(u),
      error: (err) => {
        if (err.status === 401) this.logout();
      },
    });
  }
}
