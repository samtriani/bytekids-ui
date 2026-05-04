import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

const NAV: NavItem[] = [{label:"Panel Ejecutivo",icon:"🏫",route:"/admin"},{label:"Salones",icon:"🎓",route:"/admin/classrooms"},{label:"Maestros",icon:"👩‍🏫",route:"/admin/teachers"},{label:"Estudiantes",icon:"👨‍🎓",route:"/admin/students"},{label:"Reportes IA",icon:"🤖",route:"/admin/ai-reports",badge:"IA"},{label:"Materias",icon:"📚",route:"/admin/subjects"},{label:"Métricas",icon:"📊",route:"/admin/metrics"}];

@Component({ selector:'app-admin-classrooms', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./classrooms.component.html', styleUrls:['./classrooms.component.scss']
})
export class ClassroomsComponent implements OnInit {
  navItems = NAV;
  rooms: any[] = [];
  totalStudents = 0;
  userName    = 'Director';
  userAvatar  = 'DR';

  constructor(private classroomApi: ClassroomApiService, private userApi: UserApiService, private auth: AuthService) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    forkJoin({
      classrooms: this.classroomApi.getAll(),
      allStudents: this.userApi.getStudents()   // conteo único sin duplicados
    }).subscribe({
      next: ({ classrooms, allStudents }) => {
        this.totalStudents = allStudents.length; // alumnos únicos en la plataforma

        if (!classrooms.length) { this.rooms = []; return; }

        const stuRequests = classrooms.map((c: any) =>
          this.classroomApi.getStudents(c.id).pipe(map(s => s.length))
        );

        forkJoin(stuRequests).subscribe(counts => {
          this.rooms = classrooms.map((c: any, i: number) => ({
            ...c,
            teacher:  c.teacherName ?? 'Sin maestro asignado',
            students: counts[i],
            active:   counts[i],
            avg:      0,
            trend:    '+0%',
            up:       true,
            status:   'ok',
            missions: 0,
            subjects: [],
          }));
        });
      }
    });
  }

  get alertCount() { return this.rooms.filter(r => r.status === 'warn').length; }
  rc(a: number){ return a >= 80 ? 'var(--ok)' : a < 65 ? 'var(--danger)' : 'var(--guinda)'; }
}
