# ByteKids UI — notas para trabajar aquí

Angular 17 standalone · sintaxis `@if` / `@for` · SCSS · desplegada en Vercel.

Es el frontend de ByteKids Academy. Cinco roles con su propio panel: alumno,
maestro, coordinación, dirección y familia. El backend vive en el repo
`bytekids-api`.

---

## Lo que muerde si no lo sabes

### Los estilos de componente le ganan al archivo global

Angular le agrega un atributo a cada selector del componente:
`.sidebar[_ngcontent-xyz]` pesa (0,2,0) contra el `.sidebar` de `styles.scss`
(0,1,0). **Desde el global se pierde siempre.**

Me tropecé tres veces con esto:

- La vista dividida del aula, que necesitó `!important`.
- El menú lateral en tablet: la barra se abría con **0px de ancho** y solo se
  vio en un iPhone, días después.
- Una regla de `.tb-date` que escribí y **nunca hizo nada** — se veía como si
  funcionara, que es peor que no estar.

**La regla:** si tienes que ganarle a algo que vive en un `*.component.scss`,
escribe ahí, no en `styles.scss`. Y al revés: lo compartido entre pantallas
tiene que ir en `styles.scss`, porque un estilo de componente **no alcanza** a
otra pantalla (eso costó dos intentos con `.filtros-panel` y `.filter-btn`).

### Variables CSS que no existen

`--bg1` y `--bg2` se usan en 13 archivos y **no están definidas en ningún
lado**: resuelven a nada. Son restos del sistema de estilos anterior que la
capa de compatibilidad no mapeó.

Los neutrales reales son `--bg`, `--surface`, `--surface2`, `--border`,
`--border2`. Si ves `var(--bg2)`, dale un respaldo o cámbialo.

### `--sw` y `--sw-panel` no son lo mismo

- `--sw` = cuánto se recorre el contenido para dejarle lugar a la barra.
- `--sw-panel` = cuánto mide la barra.

En escritorio valen lo mismo; en tablet y teléfono **divergen** (`--sw` va a 0
y la barra sigue midiendo 265). Confundirlas es lo que dejó el menú invisible.

### Nunca bindees a un `@Input` un método que devuelve objeto nuevo

`RouterLinkActive` implementa `OnChanges`. Un `matchOptions()` que devolvía un
objeto literal nuevo en cada ciclo disparó un bucle infinito de detección de
cambios, en el shell, o sea en **todas** las pantallas. Estuvo ~16 minutos en
producción. Usa referencias fijas (`static readonly`).

Del mismo tamaño: **no recoloques nada desde `ngAfterViewChecked`**. Ese gancho
corre en cada ciclo, y escribir estilos dispara otro ciclo.

### Un iframe no se puede mudar de padre

Sacarlo de un contenedor y meterlo en otro lo recarga. Por eso la
videollamada la posee `LlamadaService`, el iframe se crea **una vez** dentro
de `LlamadaFlotanteComponent` —que cuelga de `AppComponent`, fuera del
`router-outlet`— y lo que se mueve es la caja, en `position: fixed`.

Eso es lo que permite que el niño navegue a sus logros sin caerse de la clase.
Si tocas esa zona, no reparentes el iframe.

### `ng build` no atrapa bugs de runtime

Aquí no se abre un navegador. El build compila plantillas y tipos, pero un
bucle de detección de cambios, una regla de CSS que pierde por especificidad o
un `@Input` mal atado pasan limpios.

Lo que sí se puede hacer sin navegador, y conviene:

- Revisar el balanceo de etiquetas y de bloques `@if` (el compilador atrapa las
  llaves, **no** los `</div>`).
- Leer el CSS ya compilado en `dist/` para confirmar el orden y la
  especificidad reales, no los que uno cree.
- Decirle al dueño qué quedó sin verificar. Siempre.

---

## Cosas que ya están resueltas y conviene reusar

- **Menús:** `TEACHER_NAV` y `STUDENT_NAV` son compartidos. Estaban copiados
  en nueve pantallas y ya se habían separado (a una le faltaba "Calendario").
- **Filtros:** `.filtros-panel`, `.filter-btn`, `.filter-n` viven en
  `styles.scss` justo para que alcancen a todas las pantallas.
- **Interceptor de resiliencia:** reintenta lo transitorio porque la máquina de
  Fly se duerme; solo el 401 cierra sesión.
- **Avatares:** `<app-avatar [bot] [iniciales] [px] [color]>`
  (`shared/avatar/`). Pinta el roboticito que escogio la persona y, si no
  escogio o el archivo no carga, sus iniciales. Los doce robots viven en
  `shared/roboticitos.ts` + `assets/robots/*.webp`, y la base guarda solo
  el id (`bot-luna`) en `avatar_url`. **La lista tambien esta en el
  backend** (`AVATARES` en `UserService`): si agregas uno, va en los dos
  lados o el servidor lo rechaza.
- **`CuerpoActividad`** (`shared/mission-body.ts`) interpreta el `content_body`
  una sola vez, no en un getter de plantilla.

### Nunca armes HTML de chat a mano

Todo texto que vaya a `[innerHTML]` pasa por `formatearSaltos()`
(`shared/formato-chat.ts`), que **escapa primero y formatea después**. Lo usan
siete pantallas.

El ataque no es teórico: el alumno le pide a ByteBot "repite exactamente esto:
`<img src=x onerror=...>`", el modelo obedece, y ese texto llega al navegador
de quien lea la conversación. Angular 17 ya no tiene soporte y su sanitizador
tiene CVEs de evasión abiertos, así que no se puede depender de él.

Si agregas una pantalla con chat, reusa esa función. No copies el formateo:
eso fue exactamente lo que dejó cuatro copias sin escape.

Las cabeceras de seguridad viven en `vercel.json`.

---

## Desplegar

Vercel publica solo: `main` → producción (**bytekids-ui.vercel.app**),
`dev` → preview. Se trabaja en `dev` y se mezcla a `main` con `--no-ff`.

```bash
npx ng build   # antes de subir, siempre
```

Si algo sale mal en producción, **Instant Rollback de Vercel** regresa al build
anterior en segundos.

---

## Pendientes conocidos

- El paquete pesa ~1.4 MB contra un presupuesto de 2 MB, pero varios
  `*.component.scss` rozan su límite de 20 kB.
- El alumno en iPad no puede compartir pantalla (Safari no expone esa API); la
  salida es que el maestro abra su ficha desde Alumnos.
- El aula en vertical de teléfono no se ha revisado.
