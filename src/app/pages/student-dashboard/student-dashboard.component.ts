import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { ProgressApiService } from '../../services/api/progress-api.service';
import { ContentApiService } from '../../services/api/content-api.service';
import { AchievementApiService } from '../../services/api/achievement-api.service';
import { SubmissionApiService } from '../../services/api/submission-api.service';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, ShellComponent, RouterLink],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('xpChart')     xpChart!: ElementRef;
  @ViewChild('skillsChart') skillsChart!: ElementRef;

  navItems: NavItem[] = [
    { label: 'Mi Dashboard',  icon: '🏠', route: '/student' },
    { label: 'Mis Misiones',  icon: '🎯', route: '/student/missions', badge: 3 },
    { label: 'Mi Progreso',   icon: '📈', route: '/student/progress' },
    { label: 'Logros',        icon: '🏆', route: '/student/achievements' },
    { label: 'Tutor IA',      icon: '🤖', route: '/student/ai-tutor', badge: '✨' },
    { label: 'Proyectos',     icon: '💻', route: '/student/projects' },
    { label: 'Roblox Studio', icon: '🎮', route: '/student/roblox' },
    { label: 'Comunidad',     icon: '👥', route: '/student/community' },
  ];

  stats = [
    { icon:'⭐', value:'—', label:'XP Total',    change:'cargando…', cls:'up',      color:'#06B6D4' },
    { icon:'🎯', value:'—', label:'Misiones',    change:'cargando…', cls:'neutral', color:'#7C3AED' },
    { icon:'🏆', value:'—', label:'Logros',      change:'cargando…', cls:'up',      color:'#F59E0B' },
    { icon:'🔥', value:'—', label:'Racha activa',change:'¡Sigue así!', cls:'neutral',color:'#EC4899' },
  ];

  missions:      any[] = [];
  achievements:  any[] = [];
  private xpChartInst:     any;
  private skillsChartInst: any;

  constructor(
    private progressApi:     ProgressApiService,
    private contentApi:      ContentApiService,
    private achievementApi:  AchievementApiService,
    private submissionApi:   SubmissionApiService
  ) {}

  ngOnInit() {
    forkJoin({
      xp:       this.progressApi.getMyXp(),
      streak:   this.progressApi.getMyStreak(),
      subjects: this.progressApi.getMySubjects(),
      missions: this.contentApi.getMissions(),
      subs:     this.submissionApi.getMySubmissions(),
      earned:   this.achievementApi.getMyAchievements(),
      defs:     this.achievementApi.getAll(),
    }).subscribe({
      next: ({ xp, streak, subjects, missions, subs, earned, defs }) => {
        // Stats
        const approvedIds = new Set(subs.filter((s:any) => s.status === 'aprobado').map((s:any) => s.contentId));
        this.stats[0].value   = xp.toLocaleString();
        this.stats[0].change  = '+XP acumulado';
        this.stats[1].value   = String(missions.length);
        this.stats[1].change  = `${approvedIds.size} completadas`;
        this.stats[2].value   = String(earned.length);
        this.stats[2].change  = `de ${defs.length} posibles`;
        this.stats[3].value   = `${streak}d`;

        // Misiones recientes (primeras 5)
        this.missions = missions.slice(0, 5).map((c: any) => ({
          title:    c.title,
          subject:  c.subjectName ?? '',
          xp:       c.xpReward,
          progress: approvedIds.has(c.id) ? 100 : (subs.find((s:any) => s.contentId === c.id) ? 50 : 0),
          cls:      approvedIds.has(c.id) ? 'done' : (subs.find((s:any) => s.contentId === c.id) ? 'active' : 'new'),
          icon:     c.subjectIcon ?? '📚',
          color:    '#7C3AED',
        }));

        // Logros (primeros 6)
        const earnedIds = new Set(earned.map((e:any) => e.achievement?.id ?? e.achievementId));
        this.achievements = defs.slice(0, 6).map((d: any) => ({
          title: d.title, icon: d.icon ?? '🏆', earned: earnedIds.has(d.id)
        }));

        // Actualiza gráficas con datos reales
        if (this.xpChartInst && subjects.length) {
          const labels = subjects.map((s:any) => s.subject?.name ?? '');
          const data   = subjects.map((s:any) => s.xpInSubject ?? 0);
          this.skillsChartInst.data.labels = labels;
          this.skillsChartInst.data.datasets[0].data = data;
          this.skillsChartInst.update();
        }
      }
    });
  }

  ngAfterViewInit() {
    this.xpChartInst = new Chart(this.xpChart.nativeElement, {
      type: 'line',
      data: { labels: ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'],
        datasets: [{ label:'XP', data:[0,0,0,0,0,0], borderColor:'#7C3AED', backgroundColor:'rgba(124,58,237,0.1)', fill:true, tension:.4, pointBackgroundColor:'#7C3AED', pointRadius:5 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#6B7FBB',font:{family:'Nunito',weight:'bold'}}},
                 y:{grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#6B7FBB',font:{family:'Nunito',weight:'bold'}}} } }
    });
    this.skillsChartInst = new Chart(this.skillsChart.nativeElement, {
      type: 'radar',
      data: { labels: ['Python','HTML/CSS','Scratch','Robótica','Roblox','Lógica'],
        datasets: [{ data:[0,0,0,0,0,0], borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.15)', pointBackgroundColor:'#2563EB' }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ r:{ grid:{color:'rgba(255,255,255,0.06)'}, pointLabels:{color:'#6B7FBB',font:{family:'Nunito',size:11,weight:'bold'}}, ticks:{display:false}, suggestedMin:0, suggestedMax:100 } } }
    });
  }
}
