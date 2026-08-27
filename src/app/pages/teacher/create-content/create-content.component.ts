import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { TEACHER_NAV } from '../shared/teacher-nav';
import { ContentApiService } from '../../../services/api/content-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-create-content',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './create-content.component.html',
  styleUrls: ['./create-content.component.scss']
})
export class CreateContentComponent implements OnInit {
  navItems = TEACHER_NAV;

  teacher: any = null;
  get teacherName(): string { return this.teacher?.displayName || 'Maestro'; }
  get teacherInitials(): string { return this.teacher?.initials || 'M'; }

  // Form
  type = 'Misión';
  types = ['Misión', 'Tarea', 'Quiz', 'Proyecto', 'Material'];
  subjectId = '';                            // ID real del backend
  subjects: { id: string; name: string; icon: string }[] = [];
  diff = 'Medio';
  diffs = ['Fácil', 'Medio', 'Difícil'];
  title = ''; desc = ''; xp = 50; mins = 30; dueDate = '';
  forStudent = '';
  showPreview = false;
  toast = ''; toastType = 'ok';

  // Edit mode
  editingId: string | null = null;
  confirmDeleteId: string | null = null;

  // Classrooms from API
  classrooms: any[] = [];
  classroomId = '';
  get today(): string { return new Date().toISOString().slice(0, 10); }
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
    this.classroomApi.getMyClassrooms().pipe(catchError(() => of([]))).subscribe(cls => {
      this.classrooms = cls;
      if (cls.length) this.classroomId = cls[0]._id || cls[0].id;

      if (!cls.length) { this.loadPublished(); return; }

      // Cargar materias de todos los salones del maestro y deduplicar
      forkJoin(
        cls.map((c: any) => this.classroomApi.getSubjects(c.id || c._id).pipe(catchError(() => of([]))))
      ).subscribe(subjectLists => {
        const seen = new Set<string>();
        const all: { id: string; name: string; icon: string }[] = [];
        (subjectLists as any[][]).flat().forEach(s => {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            all.push({ id: s.id, name: s.name, icon: s.icon ?? '📚' });
          }
        });
        this.subjects  = all;
        this.subjectId = all.length ? all[0].id : '';
        this.loadPublished();
      });
    });
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
          subjectId: c.subjectId,
        }));

        // Permite entrar directo a editar desde Mis Contenidos (?edit=<id>)
        const editId = this.route.snapshot.queryParamMap.get('edit');
        if (editId && !this.editingId) {
          const target = this.published.find(p => p.id === editId);
          if (target) this.startEdit(target);
        }
      }
    });
  }

  get selectedSubjectName(): string {
    return this.subjects.find(s => s.id === this.subjectId)?.name ?? '';
  }

  useTpl(t: any): void {
    // Busca el ID de la materia por nombre
    const match = this.subjects.find(s => s.name === t.s);
    if (match) this.subjectId = match.id;
    this.xp = t.xp; this.mins = t.m; this.title = t.n; this.diff = t.d;
  }

  startEdit(p: any): void {
    this.editingId = p.id;
    this.title = p.title;
    this.desc = p.desc;
    // Buscar el subjectId correspondiente al nombre guardado
    const matched = this.subjects.find(s => s.name === p.subject || s.id === p.subjectId);
    this.subjectId = matched?.id ?? (this.subjects[0]?.id ?? '');
    this.xp = p.xp;
    this.mins = p.mins;
    this.diff = this.apiToDiff(p.diff);
    this.type = this.apiToType(p.type);
    this.showPreview = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.title = ''; this.desc = ''; this.dueDate = '';
  }

  save(): void {
    if (!this.title.trim()) return;
    const req: any = {
      title: this.title.trim(),
      description: this.desc,
      type: this.typeToApi(this.type),
      xpReward: this.xp,
      difficulty: this.diffToApi(this.diff),
      estimatedMinutes: this.mins,
    };
    if (this.subjectId) req.subjectId = this.subjectId;
    if (this.dueDate)  req.dueDate = new Date(this.dueDate).toISOString();

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
            subject: this.selectedSubjectName, xp: this.xp, diff: this.diff,
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
