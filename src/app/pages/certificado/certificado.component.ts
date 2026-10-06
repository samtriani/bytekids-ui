import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import qrcode from 'qrcode-generator';
import { CertificadoApiService, DetalleCertificado } from '../../services/api/certificado-api.service';
import { AuthService } from '../../services/auth.service';
import { roboticito } from '../../shared/roboticitos';

/** Una hoja de laurel: posición y giro dentro de una rama de 100×100. */
interface Hoja { x: number; y: number; giro: number; }

/** Las tipografías del certificado. Solo se cargan en esta página. */
const FUENTES = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Fredoka:wght@500;600;700&family=Great+Vibes&display=swap';

/**
 * El certificado, para verlo e imprimirlo.
 *
 * Lo abren el alumno, su familia y su maestro (la API decide quién puede).
 * Es una página sin el menú de la plataforma porque se imprime: el botón de
 * descargar usa la impresión del navegador, que en computadora y en iPad deja
 * guardarlo como PDF. Lo que se imprime es exactamente lo que se ve.
 *
 * Todo el arte (robot, marco, laureles, medalla, íconos) es SVG: se imprime
 * nítido a cualquier tamaño y no depende de imágenes externas. Las medidas
 * van en cqw (ancho del certificado), así se ve igual en teléfono, laptop y
 * papel. El QR lleva a /verificar/:folio, la página pública de verificación.
 */
@Component({
  selector: 'app-certificado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificado.component.html',
  styleUrls: ['./certificado.component.scss'],
})
export class CertificadoComponent implements OnInit {
  cert: DetalleCertificado | null = null;
  cargando = true;
  error = '';

  /** El QR, como un solo trazo SVG: sin imágenes ni servicios de afuera. */
  qrPath = '';
  qrModulos = 0;
  urlVerificar = '';
  urlHost = '';

  /** Rama de laurel (la otra es su espejo). */
  readonly hojas: Hoja[] = CertificadoComponent.rama();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private api: CertificadoApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarFuentes();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.cargando = false; this.error = 'No encontramos ese certificado.'; return; }
    this.api.detalle(id).subscribe({
      next: c => { this.cert = c; this.armarQr(c.folio); this.cargando = false; },
      error: err => {
        this.cargando = false;
        this.error = err?.status === 403
          ? 'Este certificado todavía no está listo, o no es tuyo.'
          : 'No pudimos cargar el certificado. Intenta de nuevo en un momento.';
      },
    });
  }

  private cargarFuentes(): void {
    if (document.querySelector('link[data-cert-fuentes]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FUENTES; l.setAttribute('data-cert-fuentes', '');
    document.head.appendChild(l);
  }

  private armarQr(folio: string): void {
    this.urlVerificar = `${window.location.origin}/verificar/${encodeURIComponent(folio)}`;
    this.urlHost = window.location.host;
    const qr = qrcode(0, 'M');
    qr.addData(this.urlVerificar);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
    this.qrModulos = n;
    this.qrPath = d;
  }

  /** Hojas a lo largo de un arco, alternando adentro y afuera. */
  private static rama(): Hoja[] {
    const hojas: Hoja[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (112 + i * 16) * Math.PI / 180;           // de abajo hacia arriba, por la izquierda
      const x = 50 + 40 * Math.cos(a), y = 50 + 40 * Math.sin(a);
      const tangente = (a * 180 / Math.PI) + 90;
      hojas.push({ x, y, giro: tangente + (i % 2 ? 38 : -38) });
    }
    return hojas;
  }

  get robotImg(): string | null { return roboticito(this.cert?.avatarUrl)?.img ?? null; }

  /** "Mi Primera IA" → ["Mi Primera", "IA"]: la IA va en dorado, como la marca. */
  get curso(): [string, string] {
    const m = (this.cert?.materia ?? '').trim();
    const i = m.lastIndexOf(' IA');
    return i > 0 && i === m.length - 3 ? [m.slice(0, i), 'IA'] : [m, ''];
  }

  /** Nombres largos no se salen: la letra baja un poco. */
  get tamNombre(): string {
    const n = (this.cert?.alumno ?? '').length;
    return n > 34 ? 'cert-nombre--xxs' : n > 26 ? 'cert-nombre--xs' : n > 20 ? 'cert-nombre--s' : n > 14 ? 'cert-nombre--m' : '';
  }
  get tamCurso(): string {
    const n = (this.cert?.materia ?? '').length;
    return n > 18 ? 'cert-curso--s' : '';
  }

  get fecha(): string {
    const f = this.cert?.entregadoEn ?? this.cert?.solicitadoEn;
    return f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  /** Espera las tipografías: si no, la primera impresión sale con letra genérica. */
  async descargar(): Promise<void> {
    try { await (document as any).fonts?.ready; } catch { /* imprime igual */ }
    window.print();
  }

  volver(): void {
    // Si llegó desde una notificación o un enlace, no hay a dónde regresar
    // en el historial: se manda a su inicio según su rol.
    if (window.history.length > 1) { this.location.back(); return; }
    const rol = this.auth.getUser()?.role;
    this.router.navigate([rol === 'student' ? '/student' : rol === 'parent' ? '/parent' : '/teacher/community']);
  }
}
