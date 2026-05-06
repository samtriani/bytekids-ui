import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'admin' | 'director' | 'student' | 'teacher' | 'parent';

export interface AppUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  panels: string[];
  initials: string;
}

const TOKEN_KEY = 'bk_token';
const USER_KEY = 'bk_user';

function roleToPanels(role: string): string[] {
  switch (role) {
    case 'student':
      return ['alumno'];
    case 'teacher':
      return ['maestro'];
    case 'parent':
      return ['padre'];
    case 'director':
      return ['director'];
    case 'admin':
      return ['alumno', 'maestro', 'padre', 'director', 'coordinador'];
    default:
      return [];
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient, private router: Router) {}

  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/login`, { username, password })
      );
      const data = response.data;
      const user: AppUser = {
        userId: data.userId,
        username: data.username,
        displayName: data.displayName,
        role: data.role,
        panels: roleToPanels(data.role),
        initials: data.displayName
          .split(' ')
          .map((word: string) => word[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { ok: true };
    } catch (error: any) {
      const message = error?.error?.message || 'Usuario o contrasena incorrectos';
      return { ok: false, error: message };
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  getUser(): AppUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUser();
  }
}
