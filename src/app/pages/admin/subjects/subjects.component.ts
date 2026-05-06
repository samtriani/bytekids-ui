import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { SubjectService } from '../../../services/api/subject-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ContentApiService } from '../../../services/api/content-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NAV: NavItem[] = [
  {label:'Panel Ejecutivo', icon:'🏫', route:'/admin'},
  {label:'Salones',         icon:'🎓', route:'/admin/classrooms'},
  {label:'Maestros',        icon:'👩‍🏫', route:'/admin/teachers'},
  {label:'Estudiantes',     icon:'👨‍🎓', route:'/admin/students'},
  {label:'Horarios',        icon:'🕐', route:'/admin/schedule'},
  {label:'Reportes IA',     icon:'🤖', route:'/admin/ai-reports', badge:'IA'},
  {label:'Materias',        icon:'📚', route:'/admin/subjects'},
  {label:'Métricas',        icon:'📊', route:'/admin/metrics'},
];

@Component({
  selector: 'app-admin-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShellComponent],
  templateUrl: './subjects.component.html',
  styleUrls: ['./subjects.component.scss']
})
export class SubjectsComponent implements OnInit {
  navItems   = NAV;
  subjects:  any[] = [];
  loading    = true;
  showForm   = false;
  saving     = false;
  toast      = '';
  form       = { name:'', icon:'📚', color:'#06B6D4', description:'' };
  userName   = 'Director';
  userAvatar = 'DR';

  get totalMissions() { return this.subjects.reduce((s, sub) => s + sub.missions, 0); }
  get avgEng()        { const v = this.subjects.filter(s => s.eng > 0); return v.length ? Math.round(v.reduce((a, s) => a + s.eng, 0) / v.length) : 0; }
  get topSubject()    { return [...this.subjects].sort((a, b) => b.eng - a.eng)[0]?.name ?? '—'; }

  constructor(
    private subjectSvc:   SubjectService,
    private classroomApi: ClassroomApiService,
    private contentApi:   ContentApiService,
    private auth:         AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    forkJoin({
      subjects:   this.subjectSvc.getAll(),
      classrooms: this.classroomApi.getAll(),
      content:    this.contentApi.getAll().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ subjects, classrooms, content }) => {
        if (!subjects.length) { this.subjects = []; this.loading = false; return; }

        forkJoin({
          clsSubjects: forkJoin(classrooms.map((c: any) =>
            this.classroomApi.getSubjects(c.id).pipe(catchError(() => of([])))
          )),
          clsStudents: forkJoin(classrooms.map((c: any) =>
            this.classroomApi.getStudents(c.id).pipe(catchError(() => of([])))
          )),
        }).subscribe(({ clsSubjects, clsStudents }) => {

          // subjectId → { cls[], uniqueStudentIds }
          const subMap: Record<string, { cls: string[]; studentIds: Set<string> }> = {};
          subjects.forEach((s: any) => { subMap[s.id] = { cls: [], studentIds: new Set() }; });

          classrooms.forEach((c: any, i: number) => {
            const subs = (clsSubjects as any[][])[i];
            const stus = (clsStudents as any[][])[i];
            subs.forEach((sub: any) => {
              if (subMap[sub.id]) {
                subMap[sub.id].cls.push(c.name);
                stus.forEach((s: any) => subMap[sub.id].studentIds.add(s.id || s._id));
              }
            });
          });

          // subjectName → missions count desde content
          const missionsByName: Record<string, number> = {};
          (content as any[]).forEach(c => {
            const name = c.subjectName ?? '';
            if (name) missionsByName[name] = (missionsByName[name] ?? 0) + 1;
          });

          const totalStudents = Math.max(1, new Set(
            (clsStudents as any[][]).flat().map((s: any) => s.id || s._id)
          ).size);

          this.subjects = subjects.map((sub: any) => {
            const info     = subMap[sub.id] ?? { cls: [], studentIds: new Set() };
            const students = info.studentIds.size;
            const eng      = Math.round((students / totalStudents) * 100);
            const missions = missionsByName[sub.name] ?? 0;
            return { ...sub, desc: sub.description ?? '', eng, students, missions, cls: info.cls };
          }).sort((a: any, b: any) => b.eng - a.eng);

          this.loading = false;
        });
      },
      error: () => { this.loading = false; }
    });
  }

  save() {
    if (!this.form.name) return;
    this.saving = true;
    this.subjectSvc.create(this.form).subscribe({
      next: s => {
        this.showToast(`✅ Materia "${s.name}" creada`);
        this.form = { name:'', icon:'📚', color:'#06B6D4', description:'' };
        this.showForm = false; this.saving = false;
        this.load();
      },
      error: (e: any) => { this.showToast('❌ ' + (e?.error?.message ?? 'Error')); this.saving = false; }
    });
  }

  showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3500); }
  ec(v: number){ return v >= 60 ? 'var(--ok)' : v >= 30 ? 'var(--guinda)' : 'var(--tx3)'; }
}
