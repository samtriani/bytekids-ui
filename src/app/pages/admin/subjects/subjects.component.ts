import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { SubjectService } from '../../../services/api/subject-api.service';
import { AuthService } from '../../../services/auth.service';

const NAV: NavItem[] = [{label:"Panel Ejecutivo",icon:"🏫",route:"/admin"},{label:"Salones",icon:"🎓",route:"/admin/classrooms"},{label:"Maestros",icon:"👩‍🏫",route:"/admin/teachers"},{label:"Estudiantes",icon:"👨‍🎓",route:"/admin/students"},{label:"Reportes IA",icon:"🤖",route:"/admin/ai-reports",badge:"IA"},{label:"Materias",icon:"📚",route:"/admin/subjects"},{label:"Métricas",icon:"📊",route:"/admin/metrics"}];

@Component({ selector:'app-admin-subjects', standalone:true, imports:[CommonModule,FormsModule,RouterLink,ShellComponent],
  templateUrl:'./subjects.component.html', styleUrls:['./subjects.component.scss']
})
export class SubjectsComponent implements OnInit {
  navItems = NAV;
  subjects:  any[] = [];
  loading   = true;
  showForm  = false;
  saving    = false;
  toast     = '';
  form      = { name:'', icon:'📚', color:'#06B6D4', description:'' };
  userName  = 'Director';
  userAvatar = 'DR';

  constructor(private subjectSvc: SubjectService, private auth: AuthService) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.subjectSvc.getAll().subscribe({
      next: s => {
        this.subjects = s.map((sub: any) => ({
          ...sub,
          desc:     sub.description ?? '',
          eng:      80,
          students: 0,
          missions: 0,
          cls:      [],
          diff:     'Intermedio',
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  save() {
    if (!this.form.name) return;
    this.saving = true;
    this.subjectSvc.create(this.form).subscribe({
      next: s => {
        this.subjects.unshift(s);
        this.showToast(`✅ Materia "${s.name}" creada`);
        this.form = { name:'', icon:'📚', color:'#06B6D4', description:'' };
        this.showForm = false; this.saving = false;
      },
      error: (e:any) => { this.showToast('❌ ' + (e?.error?.message ?? 'Error')); this.saving = false; }
    });
  }

  showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3500); }
  ec(v:number){ return v>=90?'var(--ok)':v>=80?'var(--guinda)':'var(--tx3)'; }
  dc(d:string){ const m:any={'Básico':'var(--ok)','Intermedio':'var(--info)','Avanzado':'var(--guinda)','Todos':'var(--oro)'}; return m[d]||'var(--tx3)'; }
}
