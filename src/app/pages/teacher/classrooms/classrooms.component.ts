import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const NAV: NavItem[] = [
  {label:'Mi Panel',        icon:'🏠', route:'/teacher'},
  {label:'Mis Salones',     icon:'🏫', route:'/teacher/classrooms', badge:3},
  {label:'Alumnos',         icon:'👨‍🎓', route:'/teacher/students'},
  {label:'Crear Contenido', icon:'📝', route:'/teacher/create'},
  {label:'Asistente IA',    icon:'🤖', route:'/teacher/ai-assistant', badge:'IA'},
  {label:'Reportes',        icon:'📊', route:'/teacher/reports'},
  {label:'Calendario',      icon:'📅', route:'/teacher/calendar'},
  {label:'Mensajes',        icon:'💬', route:'/teacher/messages', badge:5},
];

@Component({ selector:'app-teacher-classrooms', standalone:true,
  imports:[CommonModule, RouterLink, ShellComponent],
  templateUrl:'./classrooms.component.html', styleUrls:['./classrooms.component.scss']
})
export class ClassroomsComponent implements AfterViewInit {
  @ViewChild('radC') radC!: ElementRef;
  navItems = NAV;
  rooms = [
    { name:'4°A', students:22, avg:70, trend:'+5%', up:true,  active:16, missions:248,
      subjects:['Python','HTML/CSS','Scratch'], status:'ok',
      weekly:[60,63,65,68,70,70,70], topStudent:'Sofía Ramírez',
      desc:'Nivel intermedio. Enfocados en Python y web básico.' },
    { name:'3°B', students:18, avg:82, trend:'+8%', up:true,  active:14, missions:278,
      subjects:['Scratch','Robótica','Matemáticas'], status:'excellent',
      weekly:[72,74,77,79,80,81,82], topStudent:'Emilio Torres',
      desc:'Grupo con excelente ritmo. Primer lugar institucional.' },
    { name:'5°A', students:25, avg:62, trend:'-2%', up:false, active:10, missions:198,
      subjects:['Python','Roblox Studio','Ciencias'], status:'warn',
      weekly:[68,67,66,65,64,63,62], topStudent:'Diego Ríos',
      desc:'Requiere intervención. Tendencia a la baja este mes.' },
  ];
  sel = this.rooms[0];
  chart: any;

  rc(avg:number){ return avg>=80?'var(--ok)':avg<65?'var(--danger)':'var(--guinda)'; }

  ngAfterViewInit(){ this.renderChart(); }

  select(r: any) { this.sel = r; this.renderChart(); }

  renderChart() {
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(this.radC.nativeElement, {
      type: 'radar',
      data: {
        labels: this.sel.subjects,
        datasets: [{
          data: this.sel.subjects.map((_:any,i:number) => [75,82,60,88,70][i] ?? 65),
          backgroundColor: 'rgba(122,21,53,.12)',
          borderColor: '#7A1535',
          pointBackgroundColor: '#7A1535',
          borderWidth: 2,
        }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        scales:{ r:{ grid:{color:'#EDEEF1'}, pointLabels:{color:'#3D2D3A',font:{family:'Nunito',size:11,weight:'bold'}}, ticks:{display:false}, suggestedMin:0, suggestedMax:100 }},
        plugins:{ legend:{ display:false } }
      }
    });
  }
}
