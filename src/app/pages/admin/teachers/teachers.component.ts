import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { UserApiService } from '../../../services/api/user-api.service';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';

const NAV: NavItem[] = [{label:"Panel Ejecutivo",icon:"🏫",route:"/admin"},{label:"Salones",icon:"🎓",route:"/admin/classrooms"},{label:"Maestros",icon:"👩‍🏫",route:"/admin/teachers"},{label:"Estudiantes",icon:"👨‍🎓",route:"/admin/students"},{label:"Reportes IA",icon:"🤖",route:"/admin/ai-reports",badge:"IA"},{label:"Materias",icon:"📚",route:"/admin/subjects"},{label:"Métricas",icon:"📊",route:"/admin/metrics"}];

@Component({ selector:'app-admin-teachers', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./teachers.component.html', styleUrls:['./teachers.component.scss']
})
export class TeachersComponent implements OnInit {
  navItems = NAV;
  teachers: any[] = [];
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
      teachers:   this.userApi.getTeachers(),
      classrooms: this.classroomApi.getAll()
    }).subscribe({
      next: ({ teachers, classrooms }) => {
        this.teachers = teachers.map((t: any) => {
          const salon = classrooms.find((c: any) => c.teacherId === t.id);
          return {
            ...t,
            name:     t.displayName,
            av:       t.initials ?? t.displayName?.substring(0, 2).toUpperCase(),
            cls:      salon?.name ?? '—',
            students: 0,   // se cargaría con endpoint /classrooms/{id}/students
            sat:      85,
            avg:      0,
            missions: 0,
            status:   'Activo',
            subjects: [],
          };
        });
      }
    });
  }

  sc(s: string)  { return s === 'Excelente' ? 'tag-oro' : s === 'Requiere apoyo' ? 'tag-red' : 'tag-guinda'; }
  satC(v: number){ return v >= 90 ? 'var(--ok)' : v >= 75 ? 'var(--guinda)' : 'var(--danger)'; }
  avgC(v: number){ return v >= 80 ? 'var(--ok)' : v < 68  ? 'var(--danger)' : 'var(--guinda)'; }
}
