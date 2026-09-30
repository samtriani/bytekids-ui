import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AvanceCertificado, CertificadoApiService } from '../../services/api/certificado-api.service';

/**
 * El camino del alumno hacia su certificado, materia por materia.
 *
 * Cuatro estados, cuatro mensajes:
 *   en_curso   → cuantas le faltan. Tener la meta a la vista empuja.
 *   listo      → celebracion grande y "Solicitar mi certificado".
 *   solicitado → "tu maestro lo esta preparando": que sepa que alguien lo vio.
 *   entregado  → "Ver mi certificado".
 *
 * Si la API falla --por ejemplo, la tabla todavia no existe-- no se pinta
 * nada: esto es un extra, no debe romper la pantalla donde vive.
 */
@Component({
  selector: 'app-certificado-avance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificado-avance.component.html',
  styleUrls: ['./certificado-avance.component.scss'],
})
export class CertificadoAvanceComponent implements OnInit {
  avances: AvanceCertificado[] = [];
  pidiendo = new Set<string>();
  error = '';

  constructor(private api: CertificadoApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.mios().pipe(catchError(() => of([]))).subscribe(a => this.avances = a);
  }

  faltan(a: AvanceCertificado): number { return Math.max(0, a.total - a.aprobadas); }
  pct(a: AvanceCertificado): number { return a.total ? Math.round(a.aprobadas / a.total * 100) : 0; }

  solicitar(a: AvanceCertificado): void {
    if (this.pidiendo.has(a.subjectId)) return;
    this.pidiendo.add(a.subjectId);
    this.error = '';
    this.api.solicitar(a.subjectId).subscribe({
      next: nuevo => {
        this.pidiendo.delete(a.subjectId);
        this.avances = this.avances.map(x => x.subjectId === nuevo.subjectId ? nuevo : x);
      },
      error: err => {
        this.pidiendo.delete(a.subjectId);
        this.error = err?.error?.message || 'No se pudo enviar tu solicitud. Intenta otra vez.';
      },
    });
  }

  ver(a: AvanceCertificado): void {
    if (a.certificadoId) this.router.navigate(['/certificado', a.certificadoId]);
  }
}
