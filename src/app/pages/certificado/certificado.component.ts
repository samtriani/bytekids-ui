import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarComponent } from '../../shared/avatar/avatar.component';
import { CertificadoApiService, DetalleCertificado } from '../../services/api/certificado-api.service';
import { AuthService } from '../../services/auth.service';

/**
 * El certificado, para verlo e imprimirlo.
 *
 * Lo abren el alumno, su familia y su maestro (la API decide quien puede).
 * Es una pagina sin el menu de la plataforma porque se imprime: el boton de
 * descargar usa la impresion del navegador, que en computadora y en iPad
 * deja guardarlo como PDF. Asi no hace falta una libreria de PDF ni
 * generarlo en el servidor, y lo que se imprime es exactamente lo que se ve.
 */
@Component({
  selector: 'app-certificado',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './certificado.component.html',
  styleUrls: ['./certificado.component.scss'],
})
export class CertificadoComponent implements OnInit {
  cert: DetalleCertificado | null = null;
  cargando = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private api: CertificadoApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.cargando = false; this.error = 'No encontramos ese certificado.'; return; }
    this.api.detalle(id).subscribe({
      next: c => { this.cert = c; this.cargando = false; },
      error: err => {
        this.cargando = false;
        this.error = err?.status === 403
          ? 'Este certificado todavía no está listo, o no es tuyo.'
          : 'No pudimos cargar el certificado. Intenta de nuevo en un momento.';
      },
    });
  }

  get fecha(): string {
    const f = this.cert?.entregadoEn ?? this.cert?.solicitadoEn;
    return f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  /** "4 horas" o "45 minutos": lo que dedico, en palabras de un papa. */
  get tiempo(): string {
    const m = this.cert?.minutos ?? 0;
    if (m < 60) return `${m} minutos`;
    const h = Math.round(m / 60 * 2) / 2;
    return `${String(h).replace('.5', ' y media')} ${h === 1 ? 'hora' : 'horas'}`;
  }

  descargar(): void { window.print(); }

  volver(): void {
    // Si llego desde una notificacion o un enlace, no hay a donde regresar
    // en el historial: se manda a su inicio segun su rol.
    if (window.history.length > 1) { this.location.back(); return; }
    const rol = this.auth.getUser()?.role;
    this.router.navigate([rol === 'student' ? '/student' : rol === 'parent' ? '/parent' : '/teacher/community']);
  }
}
