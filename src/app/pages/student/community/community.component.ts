import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';

@Component({ selector:'app-community', standalone:true, imports:[CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl:'./community.component.html', styleUrls:['./community.component.scss']
})
export class CommunityComponent {
  navItems: NavItem[] = [
    { label:'Mi Dashboard',  icon:'🏠', route:'/student' }, { label:'Mis Misiones', icon:'🎯', route:'/student/missions', badge:3 },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' }, { label:'Logros', icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' }, { label:'Proyectos', icon:'💻', route:'/student/projects' },
    { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' }, { label:'Comunidad', icon:'👥', route:'/student/community' },
  ];

  posts = [
    { author:'Sofía R.', avatar:'SR', color:'#7C3AED', time:'Hace 1h', subject:'Python', title:'¡Terminé mi calculadora! 🎉', body:'¡Por fin funcionó sin errores! Me tomó 3 días pero lo logré. El truco fue usar try/except para los inputs inválidos.', likes:12, comments:['¡Súper bien Sofía! 🔥', 'Yo también tuve ese problema, gracias por el tip 🙌', '¿Me puedes compartir el código?'], showComments:false },
    { author:'Emilio T.', avatar:'ET', color:'#2563EB', time:'Hace 2h', subject:'Roblox', title:'Mi primer mapa 3D', body:'Construí un laberinto en Roblox Studio. Tardé mucho en entender las partes pero ByteBot me ayudó mucho 🤖', likes:8, comments:['¡Increíble Emilio!', 'Quiero ver el laberinto 👀', '¿Cómo lo publicaste?'], showComments:false },
    { author:'Valentina C.', avatar:'VC', color:'#10B981', time:'Ayer', subject:'Scratch', title:'Pregunta sobre sprites', body:'¿Cómo hago para que mi sprite cambie de disfraz cuando toca un objeto? No encuentro el bloque correcto', likes:2, comments:['Usa el bloque "cambiar disfraz a" dentro de "si toca"', 'También puedes usar "siguiente disfraz" en bucle', '¡Yo lo resolví así! DM para ayudarte 😊', 'Muy buena pregunta', 'ByteBot también puede ayudarte con eso', 'Suerte Val! 🍀', '¡Ya lo logré! Gracias a todos ❤️'], showComments:false },
    { author:'Carlos M.', avatar:'CM', color:'#F59E0B', time:'Ayer', subject:'HTML/CSS', title:'¿Cómo centrar en CSS? 😅', body:'Llevo 1 hora intentando centrar un div. Ya sé que es el meme clásico jaja. Flexbox al rescate', likes:15, comments:['display:flex; justify-content:center; align-items:center; 🎯', 'JAJA el meme eterno de CSS 😂', '¡Ya lo tenemos grabado a fuego!', 'Grid también funciona muy bien para eso', 'Con flexbox es lo más fácil', 'Y margin: auto también para centrado horizontal', 'Clásico de CSS 😂', 'jajaja todos pasamos por eso', '¡Bienvenido al club!'], showComments:false },
  ];

  topStudents = [
    { name:'Sofía Ramírez', xp:1890, avatar:'SR', color:'#7C3AED', rank:1 },
    { name:'Emilio Torres',  xp:1600, avatar:'ET', color:'#2563EB', rank:2 },
    { name:'Axel Partida',   xp:1250, avatar:'AP', color:'#06B6D4', rank:3 },
    { name:'Valentina Cruz', xp:980,  avatar:'VC', color:'#10B981', rank:4 },
    { name:'Mariana López',  xp:840,  avatar:'ML', color:'#EC4899', rank:5 },
  ];

  liked: Set<number> = new Set();
  showNewPost = false;
  newPostText = '';
  newPostSubject = 'General';
  toast = '';
  subjects = ['General', 'Python', 'HTML/CSS', 'Scratch', 'Robótica', 'Roblox'];

  toggleLike(i: number) { this.liked.has(i) ? this.liked.delete(i) : this.liked.add(i); }

  toggleComments(post: any) { post.showComments = !post.showComments; }

  publishPost() {
    if (!this.newPostText.trim()) return;
    this.posts.unshift({
      author: 'Axel Partida', avatar: 'AP', color: '#06B6D4',
      time: 'Ahora mismo', subject: this.newPostSubject,
      title: this.newPostText.split(' ').slice(0, 6).join(' ') + '...',
      body: this.newPostText, likes: 0, comments: [], showComments: false
    });
    this.newPostText = '';
    this.showNewPost = false;
    this.showToast('¡Publicación compartida con el salón! 🎉');
  }

  share(post: any) {
    this.showToast(`¡Link de "${post.title}" copiado! 🔗`);
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = '', 3000);
  }
}
