import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { ClassroomApiService } from '../../services/api/classroom-api.service';
import { UserApiService } from '../../services/api/user-api.service';
import { SubjectService } from '../../services/api/subject-api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const COLORS = ['#7A1535','#1A6B3C','#C4992A','#0A4D7A','#9B1A42','#5C0F27','#2E6B8A','#8A4B00'];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('enrollChart')   enrollChart!: ElementRef;
  @ViewChild('perfChart')     perfChart!: ElementRef;
  @ViewChild('subjectsChart') subjectsChart!: ElementRef;

  navItems: NavItem[] = [
    {label:'Panel Ejecutivo',icon:'🏫',route:'/admin'},
    {label:'Salones',        icon:'🎓',route:'/admin/classrooms'},
    {label:'Maestros',       icon:'👩‍🏫',route:'/admin/teachers'},
    {label:'Estudiantes',    icon:'👨‍🎓',route:'/admin/students'},
    {label:'Reportes IA',    icon:'🤖',route:'/admin/ai-reports',badge:'IA'},
    {label:'Materias',       icon:'📚',route:'/admin/subjects'},
    {label:'Métricas',       icon:'📊',route:'/admin/metrics'},
  ];

  classrooms:   any[] = [];
  teachers:     any[] = [];
  subjects:     any[] = [];
  totalStudents = 0;
  schoolYear    = '2025-2026';
  userName      = 'Director';
  userAvatar    = 'DR';

  private enrollChartInst: any;
  private subjectsChartInst: any;

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
      teachers:   this.userApi.getTeachers(),
      students:   this.userApi.getStudents(),
      subjects:   this.subjectSvc.getAll()
    }).subscribe({
      next: ({ classrooms, teachers, students, subjects }) => {
        this.classrooms = classrooms.map((c: any) => ({
          ...c,
          teacher: c.teacherName ?? 'Sin maestro',
          color:   '#7A1535',
          avg:     0,
          trend:   '+0%',
          status:  'Activo',
        }));
        this.teachers = teachers.map((t: any, i: number) => ({
          ...t,
          name:         t.displayName,
          avatar:       t.initials ?? t.displayName?.substring(0, 2).toUpperCase(),
          classroom:    classrooms.find((c: any) => c.teacherId === t.id)?.name ?? '—',
          students:     0,
          satisfaction: 85,
          color:        ['#1A6B3C','#7A1535','#C4992A','#0A4D7A'][i % 4],
        }));
        this.subjects      = subjects;
        this.totalStudents = students.length;

        // Carga alumnos por salón para el gráfico de barras
        const stuRequests = classrooms.map(c =>
          this.classroomApi.getStudents(c.id).pipe(map(s => s.length))
        );

        if (stuRequests.length) {
          forkJoin(stuRequests).subscribe(counts => {
            if (this.enrollChartInst) {
              this.enrollChartInst.data.labels   = classrooms.map(c => c.name);
              this.enrollChartInst.data.datasets[0].data = counts;
              this.enrollChartInst.update();
            }
          });
        }

        if (this.subjectsChartInst) {
          this.subjectsChartInst.data.labels = subjects.map((s: any) => s.name);
          this.subjectsChartInst.data.datasets[0].data = subjects.map((_: any, i: number) => 100 - i * 3);
          this.subjectsChartInst.data.datasets[0].backgroundColor = subjects.map((_: any, i: number) => COLORS[i % COLORS.length]);
          this.subjectsChartInst.update();
        }
      }
    });
  }

  get topSubjects() {
    return this.subjects.slice(0, 5).map((s: any, i: number) => ({
      name: s.name, icon: s.icon ?? '📚', color: s.color ?? COLORS[i % COLORS.length]
    }));
  }

  ngAfterViewInit() {
    this.enrollChartInst = new Chart(this.enrollChart.nativeElement, { type:'bar',
      data:{ labels:[], datasets:[{label:'Alumnos',data:[],backgroundColor:'rgba(122,21,53,.72)',borderColor:'#7A1535',borderWidth:1.5,borderRadius:4}]},
      options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}},
          y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}}}}});

    new Chart(this.perfChart.nativeElement, { type:'bar',
      data:{ labels:['Maestros','Alumnos','Salones','Materias'],
        datasets:[{label:'Total',data:[0,0,0,0],backgroundColor:['#1A6B3C','#7A1535','#C4992A','#0A4D7A'],borderRadius:6}]},
      options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}},
          y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}}}}});

    this.subjectsChartInst = new Chart(this.subjectsChart.nativeElement, { type:'doughnut',
      data:{ labels:[], datasets:[{data:[],backgroundColor:[],borderWidth:0}]},
      options:{ responsive:true,maintainAspectRatio:false,cutout:'58%',
        plugins:{legend:{position:'bottom',labels:{color:'#3D2D3A',font:{family:'Nunito',size:9},padding:4,boxWidth:8}}}}});
  }
}
