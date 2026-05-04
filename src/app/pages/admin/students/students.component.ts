import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

const NAV: NavItem[] = [{label:"Panel Ejecutivo",icon:"🏫",route:"/admin"},{label:"Salones",icon:"🎓",route:"/admin/classrooms"},{label:"Maestros",icon:"👩‍🏫",route:"/admin/teachers"},{label:"Estudiantes",icon:"👨‍🎓",route:"/admin/students"},{label:"Reportes IA",icon:"🤖",route:"/admin/ai-reports",badge:"IA"},{label:"Materias",icon:"📚",route:"/admin/subjects"},{label:"Métricas",icon:"📊",route:"/admin/metrics"}];

@Component({ selector:'app-admin-students', standalone:true, imports:[CommonModule,FormsModule,RouterLink,ShellComponent],
  templateUrl:'./students.component.html', styleUrls:['./students.component.scss']
})
export class StudentsComponent implements OnInit {
  navItems   = NAV;
  search     = '';
  filt       = 'Todos';
  clsFilt    = 'Todos';
  clsList:   string[] = ['Todos'];
  all:       any[]    = [];
  userName   = 'Director';
  userAvatar = 'DR';

  constructor(
    private userApi: UserApiService,
    private classroomApi: ClassroomApiService,
    private auth: AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    forkJoin({
      students:   this.userApi.getStudents(),
      classrooms: this.classroomApi.getAll()
    }).subscribe({
      next: ({ students, classrooms }) => {
        this.clsList = ['Todos', ...classrooms.map((c: any) => c.name)];

        if (!classrooms.length) { this.mapStudents(students, {}); return; }

        // Carga inscripciones: salonMap[studentId] = [nombre1, nombre2, ...]
        forkJoin(
          classrooms.map((c: any) =>
            this.classroomApi.getStudents(c.id).pipe(map((stuList: any[]) =>
              stuList.map(s => ({ id: s.id, classroom: c.name }))
            ))
          )
        ).subscribe((groups: any[][]) => {
          const salonMap: Record<string, string[]> = {};
          groups.flat().forEach(({ id, classroom }) => {
            if (!salonMap[id]) salonMap[id] = [];
            salonMap[id].push(classroom);
          });
          this.mapStudents(students, salonMap);
        });
      }
    });
  }

  private mapStudents(students: any[], salonMap: Record<string, string[]>) {
    this.all = students.map((s: any) => ({
      ...s,
      n:         s.displayName,
      av:        s.initials ?? s.displayName?.substring(0, 2).toUpperCase(),
      classrooms: salonMap[s.id] ?? [],         // array con todos los salones
      cls:        (salonMap[s.id] ?? []).join(', ') || '—',  // para filtro
      prog:      0,
      xp:        0,
      streak:    0,
      status:    'Activo',
    }));
  }

  get rows() {
    return this.all.filter(s =>
      (this.filt === 'Todos' || s.status === this.filt) &&
      (this.clsFilt === 'Todos' || s.classrooms.includes(this.clsFilt)) &&
      s.n.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  pc(p: number){ return p >= 80 ? 'var(--ok)' : p < 60 ? 'var(--danger)' : 'var(--guinda)'; }
  sc(s: string){ return s === 'Excelente' ? 'tag-oro' : s === 'Necesita apoyo' ? 'tag-red' : 'tag-guinda'; }
}
