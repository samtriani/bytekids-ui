# ByteKids AI Platform — Frontend

Angular 17 con componentes standalone. Es la cara de la plataforma: alumnos,
maestros, familias, coordinación y dirección.

> 📌 **¿Retomando el trabajo?** La bitácora está en el otro repo:
> **`bytekids-api/ESTADO.md`**. Ahí está el estado de los deploys, lo que falta
> por probar y las trampas de este código.
>
> Antes de tocar una pantalla, lee de ese archivo la sección **"Trampas de este
> proyecto"** — sobre todo la de que el shell **no tiene `<ng-content>`**.

---

## Requisitos

| | Versión | Comprobar |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

---

## Levantarlo en local

```bash
npm ci        # respeta package-lock.json — preferible a npm install
npm start     # servidor de desarrollo
```

Abre **http://localhost:4200**.

Por defecto apunta a la API local (`http://localhost:8080/api`), así que
necesitas el backend corriendo: ver `bytekids-api/README.md`.

### Trabajar contra la API de producción

Si no quieres levantar el backend, cambia temporalmente `apiUrl` en
`src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://bytekids-api.fly.dev/api'
};
```

**No subas ese cambio.** El archivo de producción es otro
(`environment.prod.ts`) y el build lo sustituye solo.

---

## Comandos

```bash
npm start                  # dev server en :4200
npm run build              # build de producción → dist/bytekids-platform/browser/
npm run watch              # rebuild automático, configuración de desarrollo
npm test                   # Karma + Jasmine (todavía sin pruebas escritas)
```

---

## 🪟 Si algo truena en Windows

Dos cosas que ya costaron tiempo en esta máquina:

**1. `Cannot find module 'rxjs'` (o cualquier otro) después de instalar.**
Pasa cuando `npm install` corre **al mismo tiempo** que un build: Windows tiene
los archivos bloqueados, npm falla con `EPERM`/`ENOTEMPTY` al intentar borrar
`rxjs`, y deja el árbol de dependencias a medias. El síntoma parece un problema
del proyecto y no lo es. Solución:

```bash
rm -rf node_modules && npm ci     # sin nada más corriendo
```

**2. `ng` no se reconoce como comando.** A veces `npm ci` no crea los enlaces
de `node_modules/.bin`. Invoca el CLI directo:

```bash
node node_modules/@angular/cli/bin/ng.js build --configuration production
```

---

## Desplegar

**Automático.** Vercel despliega solo al hacer push a `main`. No hay comando
que correr.

Para comprobar que una versión llegó de verdad, busca una cadena que solo
exista en el código nuevo dentro del bundle servido en producción — es la forma
que ya se usó antes y no miente:

```bash
curl -s https://bytekids-ui.vercel.app/ | grep -o 'main-[A-Z0-9]*\.js'
```

### `vercel.json`

Lleva **solo cabeceras de seguridad**, a propósito.

Vercel detecta Angular solo, y de esa detección salen el build y el *rewrite*
que hace que `/teacher/content` funcione al recargar. Un `vercel.json` que
declare `buildCommand`, `outputDirectory` o `rewrites` **reemplaza** esa
detección, y si algo queda mal escrito los enlaces profundos empiezan a dar 404
en producción. Con solo `headers`, Vercel los agrega **encima** del preset.

| Cabecera | Para qué |
|---|---|
| `X-Content-Type-Options: nosniff` | Que el navegador no adivine el tipo de un archivo |
| `X-Frame-Options: SAMEORIGIN` | Que nadie monte la plataforma dentro de un iframe ajeno |
| `Referrer-Policy: strict-origin-when-cross-origin` | Que la URL interna no viaje a sitios de terceros |
| `Cross-Origin-Opener-Policy: same-origin-allow-popups` | Aísla la pestaña sin romper los popups |

**No se puso `Permissions-Policy`,** aunque sería lo siguiente: el aula usa
cámara y micrófono vía Jitsi, y una política mal calibrada apaga las
videollamadas con un síntoma —permiso denegado, sin explicación— de los que
cuestan una tarde encontrar. Va cuando se pueda probar contra una clase real.

**Tampoco hay `Content-Security-Policy`.** Misma razón, en más grande: habría
que enumerar antes los orígenes de Jitsi, Google Fonts y las imágenes del
contenido, y una CSP a medias rompe pantallas en silencio.

---

## Módulos

| Rol | Ruta | Descripción |
|-----|------|-------------|
| 🏠 Landing | `/` | Selección de rol / login |
| 🚀 Estudiante | `/student` | Misiones, XP, logros, tutor |
| 🎓 Maestro | `/teacher` | Salón, alumnos, contenidos, libreta |
| 💙 Padre/Madre | `/parent` | Seguimiento de hijos, mensajes |
| 🏫 Coordinación | `/administrator` | Materias, asignaciones, horarios |
| 📊 Dirección | `/admin` | Vista ejecutiva, clases en vivo |

---

## Cómo está armado

```
src/app/
├── interceptors/   auth (token) y resilience (reintentos, 401)
├── pages/          una carpeta por rol
├── services/       llamadas a la API y estado compartido
└── shared/         shell, sidebar, topbar, helpers
```

### Al pintar texto de un chat, usa `shared/formato-chat.ts`

Nunca metas contenido de usuario o del modelo a `[innerHTML]` sin escaparlo
primero. `formatearMensaje()` y `formatearSaltos()` ya lo hacen, en ese orden
—escapar y luego formatear—, que es el que importa: al revés, el escape
convertiría en literales las etiquetas que uno acaba de generar.

No confíes en el sanitizador de Angular como única defensa: esta versión ya no
recibe parches y tiene CVEs abiertos justamente de evasión del sanitizador.

### Detalles de layout

- El shell **no tiene `<ng-content>`**. El patrón es `<app-shell ...>`
  autocerrado y el contenido como **hermano**, en un `<div class="page-wrap">`.
  Si lo metes dentro, Angular lo descarta **sin error** y la página sale vacía.
- `.page-wrap` se posiciona con `margin-left: var(--sw)` y
  `margin-top: var(--th)`. Si cambias el ancho del sidebar o el alto del
  topbar, actualiza también esas variables o **todas** las páginas se descuadran.

---

## Stack

- **Framework:** Angular 17 (standalone components)
- **Estilos:** SCSS + variables CSS
- **Gráficas:** Chart.js
- **Fuentes:** Nunito (Google Fonts)
- **Video:** Jitsi / JaaS (8x8)
