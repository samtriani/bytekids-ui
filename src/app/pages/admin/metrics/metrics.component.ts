import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ClassroomApiService } from '../../../services/api/classroom-api.service';
import { UserApiService } from '../../../services/api/user-api.service';
import { SubjectService } from '../../../services/api/subject-api.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const COLORS = ['#7A1535','#1A6B3C','#C4992A','#0A4D7A','#9B1A42','#5C0F27','#2E6B8A','#8A4B00'];
const NAV: NavItem[] = [{label:"Panel Ejecutivo",icon:"🏫",route:"/admin"},{label:"Salones",icon:"🎓",route:"/admin/classrooms"},{label:"Maestros",icon:"👩‍🏫",route:"/admin/teachers"},{label:"Estudiantes",icon:"👨‍🎓",route:"/admin/students"},{label:"Reportes IA",icon:"🤖",route:"/admin/ai-reports",badge:"IA"},{label:"Materias",icon:"📚",route:"/admin/subjects"},{label:"Métricas",icon:"📊",route:"/admin/metrics"}];

@Component({ selector:'app-admin-metrics', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./metrics.component.html', styleUrls:['./metrics.component.scss']
})
export class MetricsComponent implements OnInit, AfterViewInit {
  @ViewChild('enrollC') enrollC!: ElementRef;
  @ViewChild('perfC')   perfC!:   ElementRef;
  @ViewChild('engC')    engC!:    ElementRef;

  navItems   = NAV;
  userName   = 'Director';
  userAvatar = 'DR';

  // KPIs reales
  totalStudents  = 0;
  totalTeachers  = 0;
  totalClassrooms = 0;
  totalSubjects  = 0;

  private enrollInst: any;
  private perfInst:   any;
  private engInst:    any;

  constructor(
    private classroomApi: ClassroomApiService,
    private userApi: UserApiService,
    private subjectSvc: SubjectService,
    private auth: AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    forkJoin({
      classrooms: this.classroomApi.getAll(),
      subjects:   this.subjectSvc.getAll(),
      students:   this.userApi.getStudents(),
      teachers:   this.userApi.getTeachers(),
    }).subscribe({
      next: ({ classrooms, subjects, students, teachers }) => {
        this.totalStudents   = students.length;
        this.totalTeachers   = teachers.length;
        this.totalClassrooms = classrooms.length;
        this.totalSubjects   = subjects.length;

        // Gráfica 1 — alumnos por salón (bar)
        if (classrooms.length) {
          forkJoin(
            classrooms.map((c: any) => this.classroomApi.getStudents(c.id).pipe(map(s => s.length)))
          ).subscribe(counts => {
            const names = classrooms.map((c: any) => c.name);
            if (this.enrollInst) {
              this.enrollInst.data.labels = names;
              this.enrollInst.data.datasets[0].data = counts;
              this.enrollInst.update();
            }
            // Gráfica 3 — alumnos por salón (barras de color)
            if (this.perfInst) {
              this.perfInst.data.labels = names;
              this.perfInst.data.datasets[0].data = counts;
              this.perfInst.data.datasets[0].backgroundColor = names.map((_: any, i: number) => COLORS[i % COLORS.length]);
              this.perfInst.update();
            }
          });
        }

        // Gráfica 2 — materias (doughnut)
        if (this.engInst && subjects.length) {
          this.engInst.data.labels = subjects.map((s: any) => s.name);
          this.engInst.data.datasets[0].data = subjects.map((_: any, i: number) => Math.max(10, 100 - i * 8));
          this.engInst.data.datasets[0].backgroundColor = subjects.map((_: any, i: number) => COLORS[i % COLORS.length]);
          this.engInst.update();
        }
      }
    });
  }

  ngAfterViewInit() {
    this.enrollInst = new Chart(this.enrollC.nativeElement, { type:'bar',
      data:{ labels:[], datasets:[{label:'Alumnos por salón',data:[],backgroundColor:'rgba(122,21,53,.7)',borderColor:'#7A1535',borderWidth:1.5,borderRadius:5}]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}},
                y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}}}}});

    this.engInst = new Chart(this.engC.nativeElement, { type:'doughnut',
      data:{ labels:[], datasets:[{data:[],backgroundColor:[],borderWidth:0}]},
      options:{ responsive:true, maintainAspectRatio:false, cutout:'60%',
        plugins:{legend:{position:'right',labels:{color:'#3D2D3A',font:{family:'Nunito',size:11},padding:6,boxWidth:10}}}}});

    this.perfInst = new Chart(this.perfC.nativeElement, { type:'bar',
      data:{ labels:[], datasets:[{label:'Alumnos',data:[],backgroundColor:[],borderRadius:5}]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}},
                y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}}}}});
  }
}
