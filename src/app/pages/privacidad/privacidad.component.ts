import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Los datos del responsable. Mientras empiecen con "[" se pintan resaltados:
 * son pendientes que el dueño tiene que llenar antes de publicar en serio.
 * Están aquí juntos para que llenarlos sea cambiar un solo lugar.
 */
const RESPONSABLE = {
  nombre: '[COMPLETAR: razón social o nombre del titular]',
  marca: 'ByteKids Academy',
  domicilio: '[COMPLETAR: domicilio completo]',
  correo: '[COMPLETAR: correo para privacidad]',
  conservacion: '[COMPLETAR: plazo, por ejemplo 2 años]',
};

const ACTUALIZADO = '8 de octubre de 2026';

/**
 * Aviso de privacidad integral. Página pública (sin sesión): se enlaza desde
 * el inicio de sesión y desde la verificación de certificados.
 *
 * Es un borrador hecho con lo que la plataforma hace de verdad; antes de
 * publicarlo en serio lo debe revisar un abogado. Si cambia qué datos se
 * guardan o con qué proveedor viajan (Groq, 8x8, Neon, Fly, Vercel), este
 * texto se tiene que actualizar con su fecha.
 */
@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="pv">
      <nav class="pv-barra">
        <button type="button" class="pv-volver" (click)="volver()">← Volver</button>
        <a routerLink="/login" class="pv-marca">
          <img src="assets/logo-bytekids.jpeg" alt="">
          <span>Byte<b>Kids</b><i> Academy</i></span>
        </a>
      </nav>

      <article class="pv-doc">
        <header>
          <p class="pv-eyebrow">Aviso de privacidad integral</p>
          <h1>Así cuidamos los datos de tu familia</h1>
          <p class="pv-fecha">Última actualización: {{ actualizado }}</p>
        </header>

        <!-- En pocas palabras: lo que un papá necesita saber en 30 segundos -->
        <section class="pv-resumen" aria-label="En pocas palabras">
          <h2>En pocas palabras</h2>
          <ul>
            <li><span class="pv-ico">🧒</span><span>Usamos los datos de tu hija o hijo <b>solo para que aprenda</b> con nosotros: sus actividades, su avance y su certificado.</span></li>
            <li><span class="pv-ico">🚫</span><span><b>No vendemos ni rentamos</b> los datos de nadie. Nunca.</span></li>
            <li><span class="pv-ico">🤖</span><span>Los avatares son <b>dibujos de robots</b>: no pedimos fotos de los niños.</span></li>
            <li><span class="pv-ico">👨‍👩‍👧</span><span>Cada familia ve <b>solo a sus hijos</b>, y cada maestro solo a sus alumnos. Entre alumnos no hay chat.</span></li>
            <li><span class="pv-ico">✉️</span><span>Puedes pedirnos ver, corregir o borrar sus datos cuando quieras, escribiendo a <b [class.pv-completar]="falta(r.correo)">{{ r.correo }}</b>.</span></li>
          </ul>
        </section>

        <section>
          <h2>1. ¿Quién es responsable de los datos?</h2>
          <p>
            <b [class.pv-completar]="falta(r.nombre)">{{ r.nombre }}</b>, que opera la plataforma educativa
            <b>{{ r.marca }}</b> (en adelante, "ByteKids"), con domicilio en
            <span [class.pv-completar]="falta(r.domicilio)">{{ r.domicilio }}</span>, es responsable del
            tratamiento de los datos personales que nos proporcionas, conforme a la Ley Federal de Protección
            de Datos Personales en Posesión de los Particulares y su normativa.
          </p>
          <p>Contacto para todo lo relacionado con privacidad: <b [class.pv-completar]="falta(r.correo)">{{ r.correo }}</b>.</p>
        </section>

        <section>
          <h2>2. ¿Qué datos recabamos?</h2>
          <h3>De las niñas y los niños (alumnos)</h3>
          <ul>
            <li>Nombre y apellidos, y edad.</li>
            <li>Nombre de usuario y contraseña. La contraseña se guarda cifrada: nadie en ByteKids puede leerla.</li>
            <li>El robot que eligen como avatar.</li>
            <li>Su trabajo en la plataforma: respuestas y entregas, resultados de cuestionarios, calificaciones y comentarios de su maestro, puntos (XP), logros, rachas y certificados.</li>
            <li>Los mensajes que intercambian con su maestro.</li>
            <li>Las preguntas que le hacen a ByteBot, nuestro tutor con inteligencia artificial (ver punto 5).</li>
          </ul>
          <h3>De madres, padres o tutores</h3>
          <ul>
            <li>Nombre, nombre de usuario y contraseña (cifrada).</li>
            <li>Los datos de contacto que nos compartas, como correo o teléfono.</li>
            <li>Los mensajes que intercambias con los maestros.</li>
          </ul>
          <h3>Del personal (maestros y coordinación)</h3>
          <ul>
            <li>Nombre, nombre de usuario, correo, y los salones y horarios que tienen a su cargo.</li>
          </ul>
          <p class="pv-nota">
            <b>No pedimos datos personales sensibles</b> ni fotografías de los niños. Algunas actividades usan la
            cámara del dispositivo dentro de sitios educativos externos para fotografiar <b>dibujos en papel</b>,
            nunca caras; esas imágenes se quedan en ese sitio y no se suben a ByteKids.
          </p>
        </section>

        <section>
          <h2>3. Datos de menores de edad</h2>
          <p>
            Los alumnos de ByteKids son niñas y niños. Sus datos se tratan con el consentimiento de su madre,
            padre o tutor, quien nos proporciona la información para crear su cuenta. Si eres madre, padre o
            tutor y no autorizas el tratamiento, escríbenos y daremos de baja la cuenta y sus datos.
          </p>
        </section>

        <section>
          <h2>4. ¿Para qué usamos los datos?</h2>
          <h3>Finalidades necesarias para el servicio</h3>
          <ul>
            <li>Crear y administrar las cuentas de alumnos, familias y maestros.</li>
            <li>Impartir los cursos: actividades, clases en vivo, calificaciones y comentarios.</li>
            <li>Dar seguimiento al avance del alumno e informar a su familia.</li>
            <li>Comunicar a la familia con los maestros por mensajes dentro de la plataforma.</li>
            <li>Ofrecer el tutor ByteBot.</li>
            <li>Emitir los certificados y permitir verificarlos (ver punto 7).</li>
            <li>Mantener la plataforma segura y darte soporte.</li>
          </ul>
          <h3>Finalidades adicionales (puedes negarte)</h3>
          <ul>
            <li>Informar a madres, padres o tutores sobre otros cursos y promociones de ByteKids. Nunca enviamos publicidad directamente a los niños.</li>
            <li>Elaborar estadísticas, sin identificar a nadie, para mejorar nuestros cursos.</li>
          </ul>
          <p>
            Si no quieres que usemos tus datos para estas finalidades adicionales, escríbenos a
            <b [class.pv-completar]="falta(r.correo)">{{ r.correo }}</b> en cualquier momento. Negarte no afecta el servicio.
          </p>
        </section>

        <section>
          <h2>5. ByteBot y la inteligencia artificial</h2>
          <ul>
            <li>Para contestar, las preguntas que se le hacen a ByteBot se envían a nuestro proveedor de inteligencia artificial, que las procesa por cuenta de ByteKids conforme a sus propias políticas.</li>
            <li>En nuestra base de datos <b>no guardamos el texto</b> de esas conversaciones: solo contamos cuántos mensajes se envían al día, para el límite diario de cada alumno. La conversación visible se queda en el navegador del dispositivo.</li>
            <li>ByteBot tiene reglas para no pedir ni guardar datos personales, y les enseñamos a los niños a no compartirlos. Aun así, te pedimos platicar con tu hija o hijo para que no escriba su nombre completo, dirección, escuela ni teléfono.</li>
          </ul>
        </section>

        <section>
          <h2>6. ¿Con quién compartimos los datos?</h2>
          <p><b>No vendemos, rentamos ni intercambiamos datos personales.</b></p>
          <p>
            Para operar la plataforma usamos proveedores tecnológicos que tratan los datos únicamente por cuenta
            e instrucciones de ByteKids. Algunos se ubican fuera de México, principalmente en Estados Unidos:
          </p>
          <ul class="pv-proveedores">
            <li><b>Fly.io</b> — servidores de la aplicación.</li>
            <li><b>Neon</b> — base de datos.</li>
            <li><b>Vercel</b> — publicación de la página web.</li>
            <li><b>Groq</b> — inteligencia artificial de ByteBot.</li>
            <li><b>8x8 (Jitsi)</b> — videollamadas de las clases en vivo.</li>
            <li><b>Google Fonts</b> — tipografías de la página (recibe la dirección IP del dispositivo).</li>
          </ul>
          <p>
            Solo compartiríamos datos con terceros distintos cuando una autoridad competente lo requiera
            conforme a la ley.
          </p>
          <h3>Dentro de ByteKids</h3>
          <ul>
            <li>Cada maestro ve solo a los alumnos de sus salones; cada familia, solo a sus hijos.</li>
            <li>En la sección Comunidad, los alumnos de un mismo salón ven el nombre, el robot y los logros de sus compañeros. No existe chat entre alumnos.</li>
          </ul>
        </section>

        <section>
          <h2>7. Verificación pública de certificados</h2>
          <p>
            Cada certificado tiene un código QR para comprobar que es auténtico. Al escanearlo, cualquier persona
            ve solo el <b>nombre con la inicial del apellido</b> (por ejemplo, "Maria Z."), el programa y la fecha
            de entrega. Nada más.
          </p>
        </section>

        <section>
          <h2>8. Sitios educativos externos</h2>
          <p>
            Algunas actividades llevan a sitios educativos de terceros, como Quick, Draw! (Google), Code.org o
            Machine Learning for Kids. ByteKids no les comparte datos de los alumnos; esos sitios tienen sus
            propios avisos de privacidad.
          </p>
        </section>

        <section>
          <h2>9. Tus derechos: ver, corregir, cancelar u oponerte (ARCO)</h2>
          <p>
            Tienes derecho a <b>conocer</b> qué datos tenemos (Acceso), <b>corregirlos</b> (Rectificación),
            pedir que los <b>eliminemos</b> (Cancelación) u <b>oponerte</b> a su uso (Oposición). También puedes
            <b>revocar tu consentimiento</b>. Si se trata de un menor, lo ejerce su madre, padre o tutor.
          </p>
          <p>Escríbenos a <b [class.pv-completar]="falta(r.correo)">{{ r.correo }}</b> con:</p>
          <ol>
            <li>Tu nombre y un medio para responderte.</li>
            <li>Una identificación tuya y, si es sobre un menor, algo que acredite que eres su madre, padre o tutor.</li>
            <li>Qué derecho quieres ejercer y sobre qué datos.</li>
          </ol>
          <p>Te responderemos en los plazos que establece la ley.</p>
        </section>

        <section>
          <h2>10. Navegador y cookies</h2>
          <p>
            No usamos cookies de publicidad ni de rastreo. El navegador guarda lo necesario para que la
            plataforma funcione: tu sesión iniciada y algunas comodidades, como borradores de respuestas, pasos
            marcados y preferencias. Puedes borrarlo cerrando sesión o limpiando los datos del navegador.
          </p>
        </section>

        <section>
          <h2>11. Seguridad y conservación</h2>
          <p>
            Usamos conexiones cifradas (HTTPS), contraseñas cifradas y acceso por roles: cada persona ve solo lo
            que le corresponde. Conservamos los datos mientras la cuenta esté activa y hasta
            <span [class.pv-completar]="falta(r.conservacion)">{{ r.conservacion }}</span> después de darla de baja,
            salvo que la ley nos pida guardarlos más tiempo.
          </p>
        </section>

        <section>
          <h2>12. Cambios a este aviso</h2>
          <p>
            Cualquier cambio se publicará en esta misma página, con su fecha de actualización. Si el cambio es
            importante, también lo avisaremos dentro de la plataforma.
          </p>
          <p>
            Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir
            ante la autoridad competente en la materia.
          </p>
        </section>

        <footer class="pv-pie">© 2026 ByteKids Academy</footer>
      </article>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: linear-gradient(170deg, #FFFCF5 0%, #F1F5FF 100%); font-family: 'Nunito', system-ui, sans-serif; color: #2A2F4C; }
    .pv { max-width: 820px; margin: 0 auto; padding: 18px 16px 48px; }
    .pv-barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .pv-volver {
      cursor: pointer; font: inherit; font-size: 14px; font-weight: 800; color: #3D2D3A;
      background: #fff; border: 1px solid #D8CFC6; border-radius: 12px; padding: 9px 16px;
    }
    .pv-volver:focus-visible { outline: 3px solid #C9962B; outline-offset: 2px; }
    .pv-marca { display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 18px; font-weight: 900; color: #14234B; }
    .pv-marca img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
    .pv-marca b { color: #2F6FE0; } .pv-marca i { color: #C9962B; font-style: normal; }

    .pv-doc { background: #fff; border-radius: 20px; padding: 32px clamp(18px, 5vw, 44px); box-shadow: 0 16px 44px rgba(20,35,75,.10); }
    header { text-align: center; margin-bottom: 22px; }
    .pv-eyebrow { margin: 0; font-size: 12px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: #B07818; }
    h1 { margin: 6px 0 4px; font-size: clamp(22px, 4vw, 30px); line-height: 1.2; color: #14234B; }
    .pv-fecha { margin: 0; font-size: 13px; color: #6A6F8C; }

    .pv-resumen { background: #FBF5E8; border: 1px solid rgba(196,153,42,.35); border-radius: 16px; padding: 18px 20px; margin-bottom: 26px; }
    .pv-resumen h2 { margin-top: 0; }
    .pv-resumen ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
    .pv-resumen li { display: flex; gap: 10px; font-size: 15px; line-height: 1.5; }
    .pv-resumen .pv-ico { flex: none; }

    section { margin-bottom: 22px; }
    h2 { margin: 0 0 8px; font-size: 18px; color: #14234B; }
    h3 { margin: 14px 0 6px; font-size: 15px; color: #7A1535; }
    p, li { font-size: 15px; line-height: 1.65; }
    p { margin: 0 0 8px; }
    ul, ol { margin: 0 0 8px; padding-left: 22px; }
    .pv-nota { background: #F1F5FF; border-radius: 12px; padding: 12px 14px; }
    .pv-proveedores li { margin-bottom: 2px; }
    /* Pendientes del dueño: imposibles de pasar por alto */
    .pv-completar { background: #FFF1B8; color: #7A4A00; border-radius: 4px; padding: 0 4px; }
    .pv-pie { margin-top: 26px; text-align: center; font-size: 13px; color: #8A8698; }
  `],
})
export class PrivacidadComponent {
  readonly r = RESPONSABLE;
  readonly actualizado = ACTUALIZADO;

  constructor(private location: Location) {}

  falta(v: string): boolean { return v.startsWith('['); }

  volver(): void {
    if (window.history.length > 1) this.location.back();
    else window.location.href = '/login';
  }
}
