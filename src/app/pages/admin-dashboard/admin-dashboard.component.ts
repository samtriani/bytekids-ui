import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { ClassroomApiService } from '../../services/api/classroom-api.service';
import { UserApiService } from '../../services/api/user-api.service';
import { SubjectService } from '../../services/api/subject-api.service';
import { ProgressApiService } from '../../services/api/progress-api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  @ViewChild('enrollChart')   enrollChart!:   ElementRef;
  @ViewChild('perfChart')     perfChart!:     ElementRef;
  @ViewChild('subjectsChart') subjectsChart!: ElementRef;

  navItems: NavItem[] = [
    {label:'Panel Ejecutivo', icon:'🏫', route:'/admin'},
    {label:'Salones',         icon:'🎓', route:'/admin/classrooms'},
    {label:'Maestros',        icon:'👩‍🏫', route:'/admin/teachers'},
    {label:'Estudiantes',     icon:'👨‍🎓', route:'/admin/students'},
    {label:'Horarios',        icon:'🕐', route:'/admin/schedule'},
    {label:'Reportes IA',     icon:'🤖', route:'/admin/ai-reports', badge:'IA'},
    {label:'Materias',        icon:'📚', route:'/admin/subjects'},
    {label:'Métricas',        icon:'📊', route:'/admin/metrics'},
  ];

  classrooms:   any[] = [];
  teachers:     any[] = [];
  subjects:     any[] = [];
  totalStudents = 0;
  schoolYear    = '2025-2026';
  userName      = 'Director';
  userAvatar    = 'DR';

  private enrollChartInst: any;
  private perfChartInst:   any;
  private subjectsChartInst: any;

  constructor(
    private classroomApi: ClassroomApiService,
    private userApi:      UserApiService,
    private subjectSvc:   SubjectService,
    private progressApi:  ProgressApiService,
    private auth:         AuthService
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  ngOnInit() {
    forkJoin({
      classrooms: this.classroomApi.getAll(),
      teachers:   this.userApi.getTeachers(),
      students:   this.userApi.getStudents(),
      subjects:   this.subjectSvc.getAll(),
    }).subscribe({
      next: ({ classrooms, teachers, students, subjects }) => {
        this.subjects      = subjects;
        this.totalStudents = students.length;
        this.schoolYear    = classrooms[0]?.schoolYear ?? '2025-2026';

        // Subjects chart — distribución real (igual peso, ordenado por nombre)
        this.updateSubjectsChart(subjects);

        if (!classrooms.length) return;

        // Carga alumnos de cada salón en paralelo
        forkJoin(
          classrooms.map(c => this.classroomApi.getStudents(c.id).pipe(catchError(() => of([]))))
        ).subscribe(studentLists => {

          // Mapa teacherId → número de alumnos en su salón
          const teacherStudents: Record<string, number> = {};
          classrooms.forEach((c, i) => {
            if (c.teacherId) teacherStudents[c.teacherId] = studentLists[i].length;
          });

          // Actualiza maestros con conteo real de alumnos
          this.teachers = teachers.map((t: any, i: number) => ({
            ...t,
            name:    t.displayName,
            avatar:  t.initials ?? t.displayName?.substring(0, 2).toUpperCase(),
            classroom: classrooms.find((c: any) => c.teacherId === t.id)?.name ?? '—',
            students: teacherStudents[t.id] ?? 0,
            color:   COLORS[i % COLORS.length],
          }));

          // Enrollment chart
          this.updateEnrollChart(classrooms, studentLists.map(s => s.length));

          // Perf chart con títulos reales  — primero muestra institucional
          this.updatePerfChart(
            ['Maestros', 'Alumnos', 'Salones', 'Materias'],
            [teachers.length, students.length, classrooms.length, subjects.length],
            ['#1A6B3C', '#7A1535', '#C4992A', '#0A4D7A']
          );

          // Carga XP de todos los alumnos de todos los salones para calcular avg
          const xpRequests = studentLists.map(stuList =>
            stuList.length
              ? forkJoin(stuList.map(s =>
                  this.progressApi.getStudentXp(s.id || s._id).pipe(catchError(() => of(0)))
                ))
              : of([] as number[])
          );

          forkJoin(xpRequests).subscribe(xpLists => {
            const allXp = (xpLists as number[][]).flat().filter(x => x > 0);
            const schoolAvg = allXp.length
              ? Math.round(allXp.reduce((a, b) => a + b, 0) / allXp.length)
              : 0;

            this.classrooms = classrooms.map((c: any, i: number) => {
              const xps = (xpLists as number[][])[i];
              const avg = xpToPercent(xps);
              const diff = avg - xpToPercent(allXp);
              const trend = diff >= 0 ? `+${Math.abs(Math.round(diff))}%` : `-${Math.abs(Math.round(diff))}%`;
              const status = avg >= 75 ? 'Excelente' : avg < 50 ? 'Alerta' : 'Normal';
              return {
                ...c,
                teacher: c.teacherName ?? 'Sin maestro',
                color:   COLORS[i % COLORS.length],
                avg,
                trend,
                status,
              };
            });

            // Actualiza perf chart con promedios reales por salón
            if (this.classrooms.length) {
              this.updatePerfChart(
                this.classrooms.map(c => c.name),
                this.classrooms.map(c => c.avg),
                this.classrooms.map((_: any, i: number) => COLORS[i % COLORS.length])
              );
            }
          });
        });
      }
    });
  }

  get topSubjects() {
    return this.subjects.slice(0, 5).map((s: any, i: number) => ({
      name:  s.name,
      icon:  s.icon ?? '📚',
      color: s.color ?? COLORS[i % COLORS.length],
      pct:   Math.max(40, 100 - i * 12),   // ranking visual decreciente
    }));
  }

  private updateEnrollChart(classrooms: any[], counts: number[]) {
    if (!this.enrollChartInst) return;
    this.enrollChartInst.data.labels              = classrooms.map(c => c.name);
    this.enrollChartInst.data.datasets[0].data    = counts;
    this.enrollChartInst.update();
  }

  private updatePerfChart(labels: string[], data: number[], colors: string[]) {
    if (!this.perfChartInst) return;
    this.perfChartInst.data.labels                        = labels;
    this.perfChartInst.data.datasets[0].data              = data;
    this.perfChartInst.data.datasets[0].backgroundColor   = colors.map(c => c + 'CC');
    this.perfChartInst.data.datasets[0].borderColor       = colors;
    this.perfChartInst.update();
  }

  private updateSubjectsChart(subjects: any[]) {
    if (!this.subjectsChartInst || !subjects.length) return;
    this.subjectsChartInst.data.labels                      = subjects.map((s: any) => s.name);
    this.subjectsChartInst.data.datasets[0].data            = subjects.map((_: any, i: number) => Math.max(5, 100 - i * 8));
    this.subjectsChartInst.data.datasets[0].backgroundColor = subjects.map((_: any, i: number) => COLORS[i % COLORS.length]);
    this.subjectsChartInst.update();
  }

  ngAfterViewInit() {
    this.enrollChartInst = new Chart(this.enrollChart.nativeElement, {
      type: 'bar',
      data: { labels:[], datasets:[{label:'Alumnos', data:[], backgroundColor:'rgba(122,21,53,.72)', borderColor:'#7A1535', borderWidth:1.5, borderRadius:4}] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{grid:{display:false}, ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}},
                 y:{grid:{color:'#EDEEF1'}, ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}} } }
    });

    this.perfChartInst = new Chart(this.perfChart.nativeElement, {
      type: 'bar',
      data: { labels:[], datasets:[{label:'', data:[], backgroundColor:[], borderColor:[], borderWidth:1.5, borderRadius:6}] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{grid:{display:false}, ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}},
                 y:{grid:{color:'#EDEEF1'}, ticks:{color:'#7A6878',font:{family:'Nunito',size:10}}, max:100} } }
    });

    this.subjectsChartInst = new Chart(this.subjectsChart.nativeElement, {
      type: 'doughnut',
      data: { labels:[], datasets:[{data:[], backgroundColor:[], borderWidth:0}] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'58%',
        plugins:{legend:{position:'bottom', labels:{color:'#3D2D3A',font:{family:'Nunito',size:9},padding:4,boxWidth:8}}} }
    });
  }
}

function xpToPercent(xps: number[]): number {
  if (!xps.length) return 0;
  const avg = xps.reduce((a, b) => a + b, 0) / xps.length;
  return Math.min(100, Math.round(avg / 15)); // 1500 XP ≈ 100%
}
