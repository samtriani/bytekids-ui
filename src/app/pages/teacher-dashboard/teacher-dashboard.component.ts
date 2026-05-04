import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({ selector:'app-teacher-dashboard', standalone:true,
  imports:[CommonModule,RouterLink,ShellComponent],
  templateUrl:'./teacher-dashboard.component.html',
  styleUrls:['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements AfterViewInit {
  @ViewChild('barC') barC!: ElementRef;
  @ViewChild('pieC') pieC!: ElementRef;

  navItems: NavItem[] = [{label:"Mi Panel",icon:"🏠",route:"/teacher"},{label:"Mis Salones",icon:"🏫",route:"/teacher/classrooms",badge:3},{label:"Alumnos",icon:"👨‍🎓",route:"/teacher/students"},{label:"Crear Contenido",icon:"📝",route:"/teacher/create"},{label:"Asistente IA",icon:"🤖",route:"/teacher/ai-assistant",badge:"IA"},{label:"Reportes",icon:"📊",route:"/teacher/reports"},{label:"Calendario",icon:"📅",route:"/teacher/calendar"},{label:"Mensajes",icon:"💬",route:"/teacher/messages",badge:5}];

  students = [
    {n:'Sofía Ramírez',av:'SR',prog:92,xp:1890,trend:'↑',status:'Excelente'},
    {n:'Emilio Torres', av:'ET',prog:88,xp:1600,trend:'↑',status:'Excelente'},
    {n:'Axel Partida',  av:'AP',prog:78,xp:1250,trend:'→',status:'Bueno'},
    {n:'Valentina Cruz',av:'VC',prog:67,xp:980, trend:'↑',status:'Regular'},
    {n:'Mariana López', av:'ML',prog:53,xp:840, trend:'→',status:'Regular'},
    {n:'Carlos Mendez', av:'CM',prog:42,xp:720, trend:'↓',status:'Apoyo'},
  ];
  alerts = [
    {icon:'⚠️',text:'Carlos Mendez lleva 5 días sin actividad',type:'alert-warn'},
    {icon:'✅',text:'Sofía Ramírez completó 3 misiones esta semana',type:'alert-ok'},
    {icon:'ℹ️',text:'Valentina Cruz bajó 8% respecto al mes anterior',type:'alert-info'},
  ];
  pc(p:number){return p>=80?'#1A6B3C':p<60?'#9B1414':'#7A1535';}
  sc(s:string){return s==='Excelente'?'tag-oro':s==='Apoyo'?'tag-red':'tag-guinda';}

  ngAfterViewInit(){
    new Chart(this.barC.nativeElement,{type:'bar',
      data:{labels:this.students.map(s=>s.n.split(' ')[0]),
        datasets:[{label:'Progreso %',data:this.students.map(s=>s.prog),
          backgroundColor:this.students.map(s=>this.pc(s.prog)+'CC'),
          borderColor:this.students.map(s=>this.pc(s.prog)),
          borderWidth:1.5,borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}}},
          y:{grid:{color:'#EDEEF1'},ticks:{color:'#7A6878',font:{family:'Nunito',size:11}},max:100}}}});
    new Chart(this.pieC.nativeElement,{type:'doughnut',
      data:{labels:['Excelente','Bueno/Regular','Necesita apoyo'],
        datasets:[{data:[2,3,1],backgroundColor:['#1A6B3C','#7A1535','#9B1414'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
        plugins:{legend:{position:'bottom',labels:{color:'#3D2D3A',font:{family:'Nunito',size:11},padding:10,boxWidth:10}}}}});
  }
}
