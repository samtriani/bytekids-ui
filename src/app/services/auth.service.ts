import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LlamadaService } from './llamada.service';
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
  /** Puede crear/modificar cuentas de coordinador y director. */
  owner: boolean;
  /** El roboticito que escogio, o null si usa sus iniciales. */
  avatarUrl?: string | null;
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

  constructor(private http: HttpClient, private router: Router,
              private llamada: LlamadaService) {}

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
        owner: data.owner === true,
        avatarUrl: data.avatarUrl ?? null,
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
      return { ok: false, error: mensajeDeLogin(error) };
    }
  }

  /**
   * Guarda el robot recien escogido en el usuario local.
   *
   * Sin esto habria que volver a entrar para verlo: el avatar se lee de
   * localStorage, que solo se escribe en el login.
   */
  setAvatar(avatarUrl: string | null): void {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return;
    try {
      const user = JSON.parse(raw);
      user.avatarUrl = avatarUrl;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* Si no se puede leer, el avatar aparece al volver a entrar. */
    }
  }

  logout(): void {
    // La videollamada vive fuera del router: sin esto seguiria sonando
    // despues de cerrar sesion, ya en la pantalla de login.
    this.llamada.terminar();
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

/**
 * Lo que ve quien no pudo entrar. Antes todo lo que no fuera exito decia
 * "Usuario o contrasena incorrectos", aunque el problema fuera el internet o
 * el servidor despertando: la persona revisaba su contrasena, que estaba bien.
 */
function mensajeDeLogin(error: any): string {
  const status: number = error?.status ?? 0;
  const delServidor: string | undefined = error?.error?.message;
  if (status === 401 || status === 400 || status === 429) {
    return delServidor || 'Usuario o contraseña incorrectos';
  }
  if (status === 0) {
    return 'No pudimos conectar con ByteKids. Revisa tu internet y vuelve a intentarlo, por favor.';
  }
  if (status === 503 || status === 502 || status === 504) {
    return 'El servidor se está despertando y no alcanzó a responder. Vuelve a intentarlo en unos segundos, por favor. 🙏';
  }
  return 'Algo falló de nuestro lado. Vuelve a intentarlo en unos segundos, por favor. 🙏';
}
