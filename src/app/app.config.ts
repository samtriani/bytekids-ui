import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { resilienceInterceptor } from './interceptors/resilience.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // El orden importa: auth pone el token, resilience reintenta ese request ya firmado.
    provideHttpClient(withInterceptors([authInterceptor, resilienceInterceptor]))
  ]
};
