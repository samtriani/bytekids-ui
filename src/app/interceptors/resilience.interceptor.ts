import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, retry, tap, throwError, timer } from 'rxjs';
import { BackendStatusService } from '../services/backend-status.service';
import { LlamadaService } from '../services/llamada.service';

/**
 * Reintentos y espera entre ellos. Estaban calibrados para un backend caido
 * (2s, 5s, 10s, 15s = hasta 32s de pura espera), pero el caso real es otro:
 * la maquina esta despertando y responde en pocos segundos. Con esperas cortas
 * se conecta antes, y el total sigue dando margen suficiente para que Fly y
 * Neon terminen de arrancar.
 */
const MAX_REINTENTOS = 5;
const ESPERA_MS = [800, 1500, 3000, 5000, 8000];

/** Errores que valen la pena reintentar: el backend esta despertando o saturado. */
function esTransitorio(e: HttpErrorResponse): boolean {
  return e.status === 0        // sin red o request abortado
      || e.status === 408      // timeout
      || e.status === 429      // rate limit
      || e.status === 502      // bad gateway (la maquina aun no responde)
      || e.status === 503      // service unavailable
      || e.status === 504;     // gateway timeout
}

/**
 * Un backend dormido NO es una sesion invalida. Antes cualquier fallo terminaba
 * en pantallas con ceros y el usuario tenia que volver a iniciar sesion a mano.
 *
 * Solo el 401 cierra la sesion. El 403 NO: significa que la sesion es valida
 * pero el rol no alcanza para ese endpoint, y sacar al usuario por eso se ve
 * como si la app estuviera rota. Paso de verdad: la pantalla de Logros pedia
 * el catalogo de materias, que es solo para personal, y al alumno lo mandaba
 * al login sin explicacion. El backend distingue los dos casos desde el
 * 9-sep: sin sesion valida responde 401, y 403 solo cuando falta permiso.
 */
export const resilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const estado = inject(BackendStatusService);
  const router = inject(Router);
  const llamada = inject(LlamadaService);

  return next(req).pipe(
    retry({
      count: MAX_REINTENTOS,
      delay: (error: HttpErrorResponse, intento: number) => {
        if (!esTransitorio(error)) throw error;      // 4xx reales: no insistir
        estado.marcarDespertando();
        return timer(ESPERA_MS[Math.min(intento - 1, ESPERA_MS.length - 1)]);
      },
    }),

    tap(() => estado.marcarOk()),

    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Sesion realmente vencida: aqui si corresponde mandar al login.
        // La videollamada vive fuera del router, asi que hay que colgarla
        // a mano o seguiria sonando encima de la pantalla de login.
        llamada.terminar();
        estado.reiniciar();
        localStorage.removeItem('bk_token');
        localStorage.removeItem('bk_user');
        router.navigate(['/login'], { queryParams: { expirada: 1 } });
      } else if (error.status === 403) {
        // Sesion valida, permiso insuficiente. Se deja pasar el error para que
        // la pantalla lo maneje; cerrar la sesion seria castigar al usuario por
        // un limite de permisos que no eligio.
        estado.marcarOk();
      } else if (esTransitorio(error)) {
        estado.marcarCaido();
      } else {
        estado.marcarOk();
      }
      return throwError(() => error);
    }),
  );
};
