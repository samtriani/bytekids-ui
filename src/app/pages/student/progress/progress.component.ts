import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { ProgressApiService } from '../../../services/api/progress-api.service';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({ selector: 'app-student-progress', standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './progress.component.html', styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit, AfterViewInit {
  @ViewChild('xpLine')      xpLine!: ElementRef;
  @ViewChild('skillBar')    skillBar!: ElementRef;
  @ViewChild('subjectPie')  subjectPie!: ElementRef;

  navItems: NavItem[] = [
    { label:'Mi Dashboard',  icon:'🏠', route:'/student' },
    { label:'Mis Misiones',  icon:'🎯', route:'/student/missions', badge:3 },
    { label:'Mi Progreso',   icon:'📈', route:'/student/progress' },
    { label:'Logros',        icon:'🏆', route:'/student/achievements' },
    { label:'Tutor IA',      icon:'🤖', route:'/student/ai-tutor', badge:'✨' },
    { label:'Proyectos',     icon:'💻', route:'/student/projects' },
    { label:'Roblox Studio', icon:'🎮', route:'/student/roblox' },
    { label:'Comunidad',     icon:'👥', route:'/student/community' },
  ];

  skillProgress: any[] = [];
  weekActivity:  any[] = [];

  private barChart:  any;
  private pieChart:  any;
  private lineChart: any;
  private COLORS = ['#06B6D4','#7C3AED','#2563EB','#F59E0B','#10B981','#EC4899'];

  constructor(private progressApi: ProgressApiService) {}

  ngOnInit() {
    forkJoin({
      subjects: this.progressApi.getMySubjects(),
      activity: this.progressApi.getMyActivity(),
      xpHistory: this.progressApi.getMyXpHistory(),
    }).subscribe({
      next: ({ subjects, activity, xpHistory }) => {
        this.skillProgress = subjects.map((s: any, i: number) => ({
          name:  s.subject?.name ?? `Materia ${i+1}`,
          icon:  s.subject?.icon ?? '📚',
          level: s.level ?? 1,
          pct:   Math.min(100, ((s.xpInSubject ?? 0) % 200) / 2),
          color: this.COLORS[i % this.COLORS.length],
          xp:    s.xpInSubject ?? 0,
        }));

        // Actividad últimos 7 días
        const days = ['D','S','V','J','X','M','L'];
        this.weekActivity = days.map((day, i) => {
          const a = activity[i];
          return { day, active: !!a?.missionsCompleted, missions: a?.missionsCompleted ?? 0, xp: a?.xpEarned ?? 0 };
        }).reverse();

        // Actualiza gráficas si ya están iniciadas
        this.updateCharts(subjects, xpHistory);
      }
    });
  }

  private updateCharts(subjects: any[], xpHistory: any[]) {
    const labels = subjects.map((s:any) => s.subject?.name ?? '');
    const xpData = subjects.map((s:any) => s.xpInSubject ?? 0);
    const pctData = subjects.map((s:any) => Math.min(100, ((s.xpInSubject??0) % 200) / 2));
    const colors  = labels.map((_:any, i:number) => this.COLORS[i % this.COLORS.length]);

    if (this.barChart && labels.length) {
      this.barChart.data.labels = labels;
      this.barChart.data.datasets[0].data = pctData;
      this.barChart.data.datasets[0].backgroundColor = colors;
      this.barChart.update();
    }
    if (this.pieChart && labels.length) {
      this.pieChart.data.labels = labels;
      this.pieChart.data.datasets[0].data = xpData;
      this.pieChart.data.datasets[0].backgroundColor = colors;
      this.pieChart.update();
    }
    if (this.lineChart && xpHistory.length) {
      const history = xpHistory.slice(0, 8).reverse();
      this.lineChart.data.labels = history.map((_:any, i:number) => `Sem ${i+1}`);
      let acc = 0;
      this.lineChart.data.datasets[0].data = history.map((e:any) => { acc += e.amount ?? 0; return acc; });
      this.lineChart.update();
    }
  }

  ngAfterViewInit() {
    this.lineChart = new Chart(this.xpLine.nativeElement, {
      type:'line', data:{ labels:['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'],
        datasets:[{label:'XP', data:[0,0,0,0,0,0,0,0], borderColor:'#7C3AED', backgroundColor:'rgba(124,58,237,0.1)', fill:true, tension:.4, pointBackgroundColor:'#7C3AED', pointRadius:5}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{x:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#6B7FBB',font:{family:'Nunito',weight:'bold'}}}, y:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#6B7FBB',font:{family:'Nunito',weight:'bold'}}}}}
    });
    this.barChart = new Chart(this.skillBar.nativeElement, {
      type:'bar', data:{ labels:[], datasets:[{label:'Nivel %', data:[], backgroundColor:[], borderRadius:8}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false}, ticks:{color:'#6B7FBB',font:{family:'Nunito',weight:'bold'}}}, y:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#6B7FBB',font:{family:'Nunito',weight:'bold'}}, max:100}}}
    });
    this.pieChart = new Chart(this.subjectPie.nativeElement, {
      type:'doughnut', data:{ labels:[], datasets:[{data:[], backgroundColor:[], borderWidth:0}]},
      options:{responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{legend:{position:'right', labels:{color:'#6B7FBB', font:{family:'Nunito',weight:'bold'}, padding:8, boxWidth:10}}}}
    });
  }
}
