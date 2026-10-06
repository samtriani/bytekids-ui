import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CertificadoApiService, VerificacionCertificado } from '../../services/api/certificado-api.service';

/**
 * Lo que se abre al escanear el QR de un certificado. Pública: no pide
 * sesión. Es la página de un menor, así que la API solo da el nombre con la
 * inicial del apellido, el curso y la fecha.
 */
@Component({
  selector: 'app-verificar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="vf">
      <section class="vf-card" [class.vf-card--ok]="dato" [class.vf-card--no]="noExiste">
        <header class="vf-marca">
          <img src="assets/logo-bytekids.jpeg" alt="">
          <span>Byte<b>Kids</b><i> Academy</i></span>
        </header>

        @if (cargando) {
          <p class="vf-cargando">Verificando el certificado…</p>
        } @else if (dato) {
          <div class="vf-sello">✓</div>
          <h1>Certificado válido</h1>
          <p class="vf-sub">Este certificado fue entregado por ByteKids Academy.</p>
          <dl>
            <div><dt>Alumno</dt><dd>{{ dato.alumno }}</dd></div>
            <div><dt>Programa</dt><dd>{{ dato.materia }}</dd></div>
            <div><dt>Fecha de entrega</dt><dd>{{ fecha }}</dd></div>
            <div><dt>Folio</dt><dd class="vf-folio">{{ dato.folio }}</dd></div>
          </dl>
        } @else if (noExiste) {
          <div class="vf-sello vf-sello--no">✕</div>
          <h1>No encontramos este certificado</h1>
          <p class="vf-sub">
            Revisa que el folio <b>{{ folio }}</b> esté bien escrito. Si lo escaneaste de un
            certificado y aun así no aparece, escríbenos.
          </p>
        } @else {
          <div class="vf-sello vf-sello--no">!</div>
          <h1>No pudimos verificar ahora</h1>
          <p class="vf-sub">Vuelve a intentarlo en unos segundos, por favor.</p>
        }
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: linear-gradient(160deg, #FFFCF5, #EAF2FF); font-family: 'Nunito', system-ui, sans-serif; }
    .vf { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
    .vf-card {
      width: 100%; max-width: 440px; background: #fff; border-radius: 20px; padding: 28px 24px; text-align: center;
      border: 2px solid #E2C77E; box-shadow: 0 20px 50px rgba(20,35,75,.12);
    }
    .vf-marca { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 18px; }
    .vf-marca img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; }
    .vf-marca span { font-size: 20px; font-weight: 900; color: #14234B; }
    .vf-marca b { color: #2F6FE0; } .vf-marca i { color: #C9962B; font-style: normal; }
    .vf-cargando { color: #6A6F8C; }
    .vf-sello {
      width: 64px; height: 64px; margin: 0 auto 10px; border-radius: 50%; display: grid; place-items: center;
      font-size: 34px; font-weight: 900; color: #fff; background: #1A6B3C; box-shadow: 0 0 0 6px #E6F4EC;
    }
    .vf-sello--no { background: #9B1414; box-shadow: 0 0 0 6px #FBE9E9; }
    h1 { margin: 0; font-size: 22px; color: #14234B; }
    .vf-sub { margin: 6px 0 18px; font-size: 14px; line-height: 1.5; color: #4A4F6C; }
    dl { margin: 0; text-align: left; border-top: 1px solid #EEE7D6; }
    dl div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 2px; border-bottom: 1px solid #EEE7D6; }
    dt { font-size: 13px; font-weight: 700; color: #6A6F8C; }
    dd { margin: 0; font-size: 14px; font-weight: 800; color: #14234B; text-align: right; }
    .vf-folio { letter-spacing: .08em; }
  `],
})
export class VerificarComponent implements OnInit {
  folio = '';
  dato: VerificacionCertificado | null = null;
  cargando = true;
  noExiste = false;

  constructor(private route: ActivatedRoute, private api: CertificadoApiService) {}

  ngOnInit(): void {
    this.folio = (this.route.snapshot.paramMap.get('folio') ?? '').toUpperCase();
    this.api.verificar(this.folio).subscribe({
      next: d => { this.dato = d; this.cargando = false; },
      error: e => { this.noExiste = e?.status === 404; this.cargando = false; },
    });
  }

  get fecha(): string {
    return this.dato?.entregadoEn
      ? new Date(this.dato.entregadoEn).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
  }
}
