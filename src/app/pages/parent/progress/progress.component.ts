import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../../shared/shell/shell.component';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
const NAV: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/parent"},{label:"Mis Hijos",icon:"👦",route:"/parent/children"},{label:"Progreso",icon:"📈",route:"/parent/progress"},{label:"Logros",icon:"🏆",route:"/parent/achievements"},{label:"Mensajes",icon:"💬",route:"/parent/messages",badge:2},{label:"Calendario",icon:"📅",route:"/parent/calendar"},{label:"Asistente IA",icon:"🤖",route:"/parent/ai-assistant",badge:"IA"}];
@Component({ selector:'app-parent-progress', standalone:true, imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./progress.component.html', styleUrls:['./progress.component.scss']
})
export class ProgressComponent implements AfterViewInit {
  @ViewChild('trendC') trendC!: ElementRef;
  navItems = NAV;
  sel: 'axel'|'ant' = 'axel';
  subjects = {
    axel:[ {name:'Python',icon:'🐍',pct:75,c:'#7A1535'},{name:'HTML/CSS',icon:'🌐',pct:45,c:'#0A4D7A'},{name:'Scratch',icon:'🧩',pct:90,c:'#1A6B3C'},{name:'Robótica',icon:'🤖',pct:30,c:'#C4992A'} ],
    ant:[ {name:'Scratch',icon:'🧩',pct:55,c:'#1A6B3C'},{name:'Arte Digital',icon:'🎨',pct:70,c:'#7A1535'},{name:'Matemáticas',icon:'📐',pct:40,c:'#0A4D7A'} ]
  };
  get subs() { return this.subjects[this.sel]; }
  ngAfterViewInit() {
    new Chart(this.trendC.nativeElement, {
      type:'line', data:{ labels:['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'],
        datasets:[
          {label:'Axel',data:[65,68,72,70,76,78],borderColor:'#7A1535',backgroundColor:'rgba(122,21,53,.06)',fill:true,tension:.4,borderWidth:2},
          {label:'Antonella',data:[35,38,40,38,43,45],borderColor:'#0A4D7A',backgroundColor:'rgba(10,77,122,.06)',fill:true,tension:.4,borderWidth:2}
        ]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#3D2D3A',font:{family:'Nunito',size:11},padding:12,boxWidth:10}}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}},
          y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}},min:0,max:100}}}
    });
  }
}
