import { Component, AfterViewInit, ViewChild, ElementRef, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const DATA: Record<string, any> = {
  'Enero 2026': {
    kpis: { avg: '62%', missions: 180, trend: '+28 esta sem.' },
    rows: [
      {n:'Sofía Ramírez',av:'SR',prog:80,mis:9, xp:1400,tr:'↑',st:'Excelente'},
      {n:'Emilio Torres', av:'ET',prog:76,mis:8, xp:1200,tr:'↑',st:'Excelente'},
      {n:'Axel Partida',  av:'AP',prog:64,mis:7, xp:900, tr:'→',st:'Regular'},
      {n:'Mariana López', av:'ML',prog:50,mis:6, xp:600, tr:'↑',st:'Regular'},
      {n:'Valentina Cruz',av:'VC',prog:45,mis:5, xp:700, tr:'→',st:'Regular'},
      {n:'Carlos Mendez', av:'CM',prog:30,mis:3, xp:500, tr:'↓',st:'Necesita apoyo'},
    ],
    alerts: [
      {ico:'⚠️',txt:'Carlos Mendez lleva 10 días sin actividad',tp:'alert-warn'},
      {ico:'✅',txt:'Sofía Ramírez es la alumna más activa del mes',tp:'alert-ok'},
    ],
  },
  'Febrero 2026': {
    kpis: { avg: '66%', missions: 214, trend: '+35 esta sem.' },
    rows: [
      {n:'Sofía Ramírez',av:'SR',prog:86,mis:11,xp:1650,tr:'↑',st:'Excelente'},
      {n:'Emilio Torres', av:'ET',prog:82,mis:10,xp:1420,tr:'↑',st:'Excelente'},
      {n:'Axel Partida',  av:'AP',prog:70,mis:9, xp:1050,tr:'↑',st:'Regular'},
      {n:'Mariana López', av:'ML',prog:59,mis:7, xp:740, tr:'↑',st:'Regular'},
      {n:'Valentina Cruz',av:'VC',prog:49,mis:6, xp:860, tr:'→',st:'Regular'},
      {n:'Carlos Mendez', av:'CM',prog:36,mis:4, xp:610, tr:'↓',st:'Necesita apoyo'},
    ],
    alerts: [
      {ico:'⚠️',txt:'Carlos Mendez bajó en rendimiento vs enero',tp:'alert-warn'},
      {ico:'✅',txt:'Emilio Torres completó 5 misiones en una semana',tp:'alert-ok'},
      {ico:'ℹ️',txt:'Valentina Cruz mejoró 4% respecto a enero',tp:'alert-info'},
    ],
  },
  'Marzo 2026': {
    kpis: { avg: '70%', missions: 248, trend: '+42 esta sem.' },
    rows: [
      {n:'Sofía Ramírez',av:'SR',prog:92,mis:13,xp:1890,tr:'↑',st:'Excelente'},
      {n:'Emilio Torres', av:'ET',prog:88,mis:12,xp:1600,tr:'↑',st:'Excelente'},
      {n:'Axel Partida',  av:'AP',prog:78,mis:11,xp:1250,tr:'→',st:'Regular'},
      {n:'Mariana López', av:'ML',prog:67,mis:9, xp:840, tr:'↑',st:'Regular'},
      {n:'Valentina Cruz',av:'VC',prog:53,mis:7, xp:980, tr:'→',st:'Regular'},
      {n:'Carlos Mendez', av:'CM',prog:42,mis:5, xp:720, tr:'↓',st:'Necesita apoyo'},
    ],
    alerts: [
      {ico:'⚠️',txt:'Carlos Mendez lleva 5 días sin actividad',tp:'alert-warn'},
      {ico:'✅',txt:'Sofía Ramírez completó 3 misiones esta semana',tp:'alert-ok'},
      {ico:'ℹ️',txt:'Valentina Cruz bajó 8% respecto al mes anterior',tp:'alert-info'},
    ],
  },
};

@Component({ selector:'app-teacher-reports', standalone:true, imports:[CommonModule,FormsModule,RouterLink,ShellComponent],
  templateUrl:'./reports.component.html', styleUrls:['./reports.component.scss'] })
export class ReportsComponent implements AfterViewInit {
  @ViewChild('barC') barC!: ElementRef;
  @ViewChild('dntC') dntC!: ElementRef;
  navItems: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/teacher"},{label:"Mis Salones",icon:"🏫",route:"/teacher/classrooms",badge:3},{label:"Alumnos",icon:"👨‍🎓",route:"/teacher/students"},{label:"Crear Contenido",icon:"📝",route:"/teacher/create"},{label:"Asistente IA",icon:"🤖",route:"/teacher/ai-assistant",badge:"IA"},{label:"Reportes",icon:"📊",route:"/teacher/reports"},{label:"Calendario",icon:"📅",route:"/teacher/calendar"},{label:"Mensajes",icon:"💬",route:"/teacher/messages",badge:5}];

  period = 'Marzo 2026';
  periods = ['Enero 2026','Febrero 2026','Marzo 2026'];
  toast = '';
  private barChart: Chart | null = null;

  get data() { return DATA[this.period]; }
  get rows() { return this.data.rows; }
  get alerts() { return this.data.alerts; }
  get kpis() { return this.data.kpis; }

  onPeriodChange() {
    if (this.barChart) {
      const r = this.data.rows;
      this.barChart.data.datasets[0].data = r.map((x: any) => x.prog);
      (this.barChart.data.datasets[0] as any).backgroundColor = r.map((x: any) => this.pc(x.prog) + 'CC');
      (this.barChart.data.datasets[0] as any).borderColor = r.map((x: any) => this.pc(x.prog));
      this.barChart.update();
    }
  }

  exportPDF() { this.showToast('📄 Reporte exportado como PDF — Salón 4°A ' + this.period); }
  sendToDirector() { this.showToast('📨 Reporte enviado al Director · ' + this.period); }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = '', 3500);
  }

  pc(p:number){return p>=80?'#1A6B3C':p<60?'#9B1414':'#7A1535';}
  sc(s:string){return s==='Excelente'?'tag-oro':s==='Necesita apoyo'?'tag-red':'tag-guinda';}
  tc(t:string){return t==='↑'?'var(--ok)':t==='↓'?'var(--danger)':'var(--tx3)';}

  ngAfterViewInit(){
    const r = this.data.rows;
    this.barChart = new Chart(this.barC.nativeElement,{type:'bar',
      data:{labels:r.map((x: any)=>x.n.split(' ')[0]),
        datasets:[{label:'%',data:r.map((x: any)=>x.prog),backgroundColor:r.map((x: any)=>this.pc(x.prog)+'CC'),borderColor:r.map((x: any)=>this.pc(x.prog)),borderWidth:1.5,borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}},
          y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}},max:100}}}});
    new Chart(this.dntC.nativeElement,{type:'doughnut',
      data:{labels:['Python','HTML/CSS','Scratch','Robótica','Roblox'],
        datasets:[{data:[35,20,25,10,10],backgroundColor:['#7A1535','#C4992A','#1A6B3C','#0A4D7A','#5C0F27'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
        plugins:{legend:{position:'bottom',labels:{color:'#3D2D3A',font:{family:'Nunito',size:11},padding:8,boxWidth:10}}}}});
  }
}
