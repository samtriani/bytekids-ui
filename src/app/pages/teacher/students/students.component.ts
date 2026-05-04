import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { ProgressApiService } from '../../../services/api/progress-api.service';

const NAV: NavItem[] = [
  {label:'Mi Panel',icon:'🏠',route:'/teacher'},{label:'Mis Salones',icon:'🏫',route:'/teacher/classrooms',badge:3},
  {label:'Alumnos',icon:'👨‍🎓',route:'/teacher/students'},{label:'Crear Contenido',icon:'📝',route:'/teacher/create'},
  {label:'Asistente IA',icon:'🤖',route:'/teacher/ai-assistant',badge:'IA'},{label:'Reportes',icon:'📊',route:'/teacher/reports'},
  {label:'Calendario',icon:'📅',route:'/teacher/calendar'},{label:'Mensajes',icon:'💬',route:'/teacher/messages',badge:5},
];

@Component({ selector:'app-teacher-students', standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,ShellComponent],
  templateUrl:'./students.component.html', styleUrls:['./students.component.scss']
})
export class StudentsComponent implements OnInit {
  navItems = NAV;
  search = ''; filt = 'Todos'; view: 'table'|'cards' = 'table';
  filters = ['Todos','Excelente','Regular','Necesita apoyo'];
  selected: any = null;
  toast = '';
  loading = true;
  all: any[] = [];

  constructor(private router: Router, private classroomApi: ClassroomApiService) {}

  ngOnInit() {
    // Carga alumnos de todos los salones del maestro
    this.classroomApi.getMyClassrooms().subscribe({
      next: (classrooms) => {
        if (!classrooms.length) { this.loading = false; return; }
        // Toma el primer salón y carga sus alumnos
        const cls = classrooms[0];
        this.classroomApi.getStudents(cls.id).subscribe({
          next: (students) => {
            this.all = students.map((s: any) => ({
              id:     s.id,
              n:      s.displayName,
              av:     s.initials ?? s.displayName.substring(0,2).toUpperCase(),
              cls:    cls.name,
              prog:   0,
              xp:     0,
              streak: 0,
              status: 'Regular',
              last:   '—',
              subjects: [],
              nextMission: '—',
              note:   '',
              missions: [],
            }));
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  get rows() {
    return this.all.filter(s =>
      (this.filt==='Todos' || s.status===this.filt) &&
      s.n.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  openStudent(s: any) { this.selected = s; }
  closeModal() { this.selected = null; }

  msgStudent(s: any) {
    this.closeModal();
    this.router.navigate(['/teacher/messages'], { queryParams: { to: s.n } });
  }

  assignMission(s: any) {
    this.closeModal();
    this.router.navigate(['/teacher/create'], { queryParams: { for: s.n } });
  }

  sendAlert(s: any) {
    this.showToast(`⚠️ Alerta enviada a padres de ${s.n.split(' ')[0]}`);
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = '', 3500);
  }

  pc(p:number){ return p>=80?'var(--ok)':p<60?'var(--danger)':'var(--guinda)'; }
  sc(s:string){ return s==='Excelente'?'tag-oro':s==='Necesita apoyo'?'tag-red':'tag-guinda'; }
}
