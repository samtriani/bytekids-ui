# ByteKids AI Platform

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
