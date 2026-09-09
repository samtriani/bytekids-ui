import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LlamadaFlotanteComponent } from './shared/llamada-flotante/llamada-flotante.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LlamadaFlotanteComponent],
  // La llamada va FUERA del router-outlet a propósito: así no se destruye al
  // navegar y el niño puede ir a sus logros o a su tablero sin caerse de la
  // clase. Ver LlamadaService para por qué el iframe no se puede mudar.
  template: '<router-outlet></router-outlet><app-llamada-flotante />',
})
export class AppComponent {}
