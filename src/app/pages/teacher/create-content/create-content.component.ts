import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ContentApiService } from '../../../services/api/content-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AuthService } from '../../../services/auth.service';

const NAV: NavItem[] = [
  {label:'Mi Panel',        icon:'🏠', route:'/teacher'},
  {label:'Mis Salones',     icon:'🏫', route:'/teacher/classrooms'},
  {label:'Alumnos',         icon:'👨‍🎓', route:'/teacher/students'},
  {label:'Crear Contenido', icon:'📝', route:'/teacher/create'},
  {label:'Asistente IA',    icon:'🤖', route:'/teacher/ai-assistant', badge:'IA'},
  {label:'Reportes',        icon:'📊', route:'/teacher/reports'},
  {label:'Calendario',      icon:'📅', route:'/teacher/calendar'},
  {label:'Mensajes',        icon:'💬', route:'/teacher/messages'},
];

@Component({
  selector: 'app-create-content',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './create-content.component.html',
  styleUrls: ['./create-content.component.scss']
})
export class CreateContentComponent implements OnInit {
  navItems = NAV;

  teacher: any = null;
  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }

  // Form
  type = 'Misión';
  types = ['Misión', 'Tarea', 'Quiz', 'Proyecto', 'Material'];
  subject = 'Python';
  subjects = ['Python', 'HTML/CSS/JS', 'Scratch', 'Robótica', 'Roblox Studio', 'Matemáticas'];
  diff = 'Medio';
  diffs = ['Fácil', 'Medio', 'Difícil'];
  title = ''; desc = ''; xp = 50; mins = 30;
  forStudent = '';
  showPreview = false;
  toast = ''; toastType = 'ok';

  // Edit mode
  editingId: string | null = null;
  confirmDeleteId: string | null = null;

  // Classrooms from API
  classrooms: any[] = [];
  classroomId = '';
  get classroomLabel(): string {
    return this.classrooms.find(c => (c._id || c.id) === this.classroomId)?.name || '—';
  }

  tpls = [
    {n:'Misión Python básica',    s:'Python',        xp:50,  m:30,  d:'Fácil'},
    {n:'Proyecto web HTML/CSS',   s:'HTML/CSS/JS',   xp:120, m:90,  d:'Medio'},
    {n:'Quiz de Scratch',         s:'Scratch',       xp:40,  m:20,  d:'Fácil'},
    {n:'Reto Roblox Studio',      s:'Roblox Studio', xp:200, m:120, d:'Difícil'},
    {n:'Ejercicio robótica',      s:'Robótica',      xp:80,  m:60,  d:'Medio'},
  ];

  published: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private contentApi: ContentApiService,
    private classroomApi: ClassroomApiService,
    private auth: AuthService
  ) {
    const forParam = this.route.snapshot.queryParamMap.get('for');
    if (forParam) { this.forStudent = forParam; this.title = `Tarea personalizada para ${forParam}`; }
  }

  ngOnInit(): void {
    this.teacher = this.auth.getUser();
    this.classroomApi.getMyClassrooms().subscribe({
      next: cls => {
        this.classrooms = cls;
        if (cls.length) this.classroomId = cls[0]._id || cls[0].id;
      }
    });
    this.loadPublished();
  }

  private loadPublished(): void {
    this.contentApi.getMyContent().subscribe({
      next: items => {
        this.published = items.map(c => ({
          id: c._id || c.id,
          title: c.title,
          type: c.type,
          subject: c.subjectName ?? '',
          xp: c.xpReward,
          diff: c.difficulty ?? '',
          mins: c.estimatedMinutes ?? 0,
          desc: c.description ?? '',
          date: c.createdAt?.substring(0, 10) ?? '—',
        }));
      }
    });
  }

  useTpl(t: any): void {
    this.subject = t.s; this.xp = t.xp; this.mins = t.m; this.title = t.n; this.diff = t.d;
  }

  startEdit(p: any): void {
    this.editingId = p.id;
    this.title = p.title;
    this.desc = p.desc;
    this.subject = p.subject || this.subjects[0];
    this.xp = p.xp;
    this.mins = p.mins;
    this.diff = this.apiToDiff(p.diff);
    this.type = this.apiToType(p.type);
    this.showPreview = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.title = ''; this.desc = '';
  }

  save(): void {
    if (!this.title.trim()) return;
    const req = {
      title: this.title.trim(),
      description: this.desc,
      type: this.typeToApi(this.type),
      subjectName: this.subject,
      xpReward: this.xp,
      difficulty: this.diffToApi(this.diff),
      estimatedMinutes: this.mins,
    };

    if (this.editingId) {
      this.contentApi.update(this.editingId, req).subscribe({
        next: () => {
          const idx = this.published.findIndex(p => p.id === this.editingId);
          if (idx >= 0) {
            this.published[idx] = { ...this.published[idx], ...req, type: this.type, diff: this.diff };
          }
          this.showToast(`✅ "${this.title}" actualizado`, 'ok');
          this.cancelEdit();
          this.showPreview = false;
        },
        error: () => this.showToast('❌ Error al actualizar', 'error')
      });
    } else {
      this.contentApi.create(req).subscribe({
        next: created => {
          const cid = created._id || created.id;
          this.contentApi.publish(cid).subscribe(() => {
            if (this.classroomId) {
              this.contentApi.assign(cid, { classroomId: this.classroomId }).subscribe();
            }
          });
          this.published.unshift({
            id: cid, title: this.title, type: this.type,
            subject: this.subject, xp: this.xp, diff: this.diff,
            mins: this.mins, desc: this.desc,
            date: new Date().toISOString().substring(0, 10),
          });
          this.showToast(`✅ "${this.title}" publicado`, 'ok');
          this.title = ''; this.desc = ''; this.showPreview = false;
        },
        error: () => this.showToast('❌ Error al publicar. Verifica la sesión.', 'error')
      });
    }
  }

  deleteContent(id: string): void {
    this.contentApi.delete(id).subscribe({
      next: () => {
        this.published = this.published.filter(p => p.id !== id);
        this.confirmDeleteId = null;
        this.showToast('🗑️ Contenido eliminado', 'ok');
        if (this.editingId === id) this.cancelEdit();
      },
      error: () => { this.confirmDeleteId = null; this.showToast('❌ Error al eliminar', 'error'); }
    });
  }

  showToast(msg: string, type = 'ok'): void {
    this.toast = msg; this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }

  typeToApi(t: string): string {
    const m: Record<string, string> = { 'Misión':'mision','Tarea':'tarea','Quiz':'quiz','Proyecto':'proyecto','Material':'material' };
    return m[t] ?? 'mision';
  }
  apiToType(t: string): string {
    const m: Record<string, string> = { mision:'Misión', tarea:'Tarea', quiz:'Quiz', proyecto:'Proyecto', material:'Material' };
    return m[t] ?? 'Misión';
  }
  diffToApi(d: string): string { return d === 'Fácil' ? 'facil' : d === 'Difícil' ? 'dificil' : 'medio'; }
  apiToDiff(d: string): string { return d === 'facil' ? 'Fácil' : d === 'dificil' ? 'Difícil' : 'Medio'; }
}
