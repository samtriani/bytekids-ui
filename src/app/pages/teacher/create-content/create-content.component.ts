import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ContentApiService } from '../../../services/api/content-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';

@Component({ selector:'app-create-content', standalone:true, imports:[CommonModule,FormsModule,RouterLink,ShellComponent],
  templateUrl:'./create-content.component.html', styleUrls:['./create-content.component.scss']
})
export class CreateContentComponent implements OnInit {
  navItems: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/teacher"},{label:"Mis Salones",icon:"🏫",route:"/teacher/classrooms",badge:3},{label:"Alumnos",icon:"👨‍🎓",route:"/teacher/students"},{label:"Crear Contenido",icon:"📝",route:"/teacher/create"},{label:"Asistente IA",icon:"🤖",route:"/teacher/ai-assistant",badge:"IA"},{label:"Reportes",icon:"📊",route:"/teacher/reports"},{label:"Calendario",icon:"📅",route:"/teacher/calendar"},{label:"Mensajes",icon:"💬",route:"/teacher/messages",badge:5}];

  type='Misión'; types=['Misión','Tarea','Quiz','Proyecto','Material'];
  subject='Python'; subjects=['Python','HTML/CSS/JS','Scratch','Robótica','Roblox Studio','Matemáticas'];
  diff='Medio'; diffs=['Fácil','Medio','Difícil'];
  title=''; desc=''; xp=50; mins=30; grade='4°A'; grades=['2°A','3°B','4°A','5°A'];
  forStudent = '';
  showPreview = false;
  toast = '';

  tpls=[
    {n:'Misión Python básica',     s:'Python',        xp:50,  m:30,  d:'Fácil'},
    {n:'Proyecto web HTML/CSS',    s:'HTML/CSS/JS',   xp:120, m:90,  d:'Medio'},
    {n:'Quiz de Scratch',          s:'Scratch',       xp:40,  m:20,  d:'Fácil'},
    {n:'Reto Roblox Studio',       s:'Roblox Studio', xp:200, m:120, d:'Difícil'},
    {n:'Ejercicio robótica',       s:'Robótica',      xp:80,  m:60,  d:'Medio'},
  ];

  published: any[] = [];
  classrooms: any[] = [];
  classroomId = '';

  constructor(
    private route: ActivatedRoute,
    private contentApi: ContentApiService,
    private classroomApi: ClassroomApiService
  ) {
    const forParam = this.route.snapshot.queryParamMap.get('for');
    if (forParam) { this.forStudent = forParam; this.title = `Tarea personalizada para ${forParam}`; }
  }

  ngOnInit() {
    // Carga salones del maestro
    this.classroomApi.getMyClassrooms().subscribe({
      next: (cls) => {
        this.classrooms = cls;
        if (cls.length) this.classroomId = cls[0].id;
      }
    });
    // Carga contenido publicado propio
    this.contentApi.getMyContent().subscribe({
      next: (items) => {
        this.published = items.map(c => ({
          id: c.id, title: c.title, type: c.type,
          subject: c.subjectName ?? '', grade: '—', xp: c.xpReward,
          date: c.createdAt?.substring(0, 10) ?? '—'
        }));
      }
    });
  }

  useTpl(t:any){this.subject=t.s;this.xp=t.xp;this.mins=t.m;this.title=t.n;this.diff=t.d;}

  typeToApi(t: string): string {
    const map: Record<string,string> = { 'Misión':'mision','Tarea':'tarea','Quiz':'quiz','Proyecto':'proyecto','Material':'material' };
    return map[t] ?? 'mision';
  }
  diffToApi(d: string): string {
    return d === 'Fácil' ? 'facil' : d === 'Difícil' ? 'dificil' : 'medio';
  }

  save() {
    if (!this.title.trim()) return;
    const req = {
      title: this.title, description: this.desc,
      type: this.typeToApi(this.type),
      xpReward: this.xp, difficulty: this.diffToApi(this.diff),
      estimatedMinutes: this.mins,
    };
    this.contentApi.create(req).subscribe({
      next: (created) => {
        // Publica automáticamente y asigna al salón seleccionado
        this.contentApi.publish(created.id).subscribe(() => {
          if (this.classroomId) {
            this.contentApi.assign(created.id, { classroomId: this.classroomId }).subscribe();
          }
        });
        const now = new Date();
        const date = now.getDate() + ' ' + ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][now.getMonth()];
        this.published.unshift({ id: created.id, title: this.title, type: this.type, subject: this.subject, grade: this.grade, xp: this.xp, date });
        this.showToast(`✅ "${this.title}" publicado`);
        this.title=''; this.desc=''; this.showPreview=false;
      },
      error: () => this.showToast('❌ Error al publicar. Verifica la sesión.')
    });
  }

  showToast(msg: string) { this.toast=msg; setTimeout(()=>this.toast='',4000); }
}
