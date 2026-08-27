# ByteKids AI Platform

> 📌 **¿Retomando el trabajo?** La bitácora de en qué se quedó el proyecto está en
> el repo de la API: **`bytekids-api/ESTADO.md`**. Ahí está el estado de los deploys,
> los pendientes por probar y las trampas de este código.
>
> Antes de tocar una pantalla, lee de ese archivo la sección **"Trampas de este
> proyecto"** — sobre todo la de que el shell **no tiene `<ng-content>`**: si metes
> el contenido dentro de `<app-shell>`, Angular lo descarta sin dar error.

## 🚀 Cómo levantar la app

### Prerrequisitos
- Node.js 18+ 
- npm 9+

### Instalación
```bash
npm install
```

### Desarrollo (servidor local)
```bash
npm start
# o
npx ng serve
```
Abre http://localhost:4200 en tu navegador.

### Build para producción
```bash
npm run build
```
El output queda en `/dist/bytekids-platform/browser/`

## 📱 Módulos

| Rol | Ruta | Descripción |
|-----|------|-------------|
| 🏠 Landing | `/` | Selección de rol / login |
| 🚀 Estudiante | `/student` | Dashboard del alumno con misiones, XP, logros |
| 🎓 Maestro | `/teacher` | Gestión del salón, alumnos, tareas |
| 💙 Padre/Madre | `/parent` | Seguimiento de hijos, mensajes |
| 🏫 Director | `/admin` | Vista ejecutiva completa |

## 🎨 Stack Técnico
- **Framework:** Angular 17 (Standalone Components)
- **Estilos:** SCSS + Variables CSS
- **Gráficas:** Chart.js
- **Fuentes:** Nunito (Google Fonts)
- **Colores:** Sistema de design ByteKids
