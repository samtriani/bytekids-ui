import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShellComponent, NavItem } from '../../shared/shell/shell.component';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShellComponent],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.scss']
})
export class ParentDashboardComponent implements AfterViewInit {
  @ViewChild('actChart') actChart!: ElementRef;

  navItems: NavItem[] = [
    { label:'Panel Principal',  icon:'🏠', route:'/parent' },
    { label:'Mis Hijos',        icon:'👦', route:'/parent/children' },
    { label:'Progreso',         icon:'📈', route:'/parent/progress' },
    { label:'Logros',           icon:'🏆', route:'/parent/achievements' },
    { label:'Mensajes',         icon:'💬', route:'/parent/messages', badge:2 },
    { label:'Calendario',       icon:'📅', route:'/parent/calendar' },
    { label:'Asistente IA',     icon:'🤖', route:'/parent/ai-assistant', badge:'✨' },
  ];

  children = [
    { name:'Axel', grade:'4°A', avatar:'AX', progress:78, xp:1250, streak:12, level:5, subject:'Python', color:'#7B1034' },
    { name:'Antonella', grade:'Preescolar A', avatar:'AN', progress:45, xp:420, streak:5, level:2, subject:'Scratch', color:'#C9A84C' },
  ];

  recentActivity = [
    { child:'Axel', icon:'⚡', text:'Completó misión: Condicionales IF/ELSE', time:'Hoy 09:15', color:'#7B1034' },
    { child:'Axel', icon:'🐛', text:'Ganó logro: Bug Hunter', time:'Hoy 08:40', color:'#7B1034' },
    { child:'Antonella', icon:'🎨', text:'Completó: Mi primera animación', time:'Ayer 15:20', color:'#C9A84C' },
    { child:'Axel', icon:'🔥', text:'Nueva racha de 12 días consecutivos', time:'Ayer 07:00', color:'#7B1034' },
  ];

  messages = [
    { from:'Profa. García', text:'Axel completó la misión de Python esta semana 🎉', time:'10 min', avatar:'MG' },
    { from:'Profa. Mendoza', text:'Antonella hizo su primera animación en Scratch', time:'Ayer', avatar:'AM' },
  ];

  ngAfterViewInit() {
    new Chart(this.actChart.nativeElement, {
      type: 'line',
      data: {
        labels: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
        datasets: [
          { label:'Axel', data:[60,95,0,80,140,50,0], borderColor:'#7B1034', backgroundColor:'rgba(123,16,52,0.08)', fill:true, tension:0.4 },
          { label:'Antonella', data:[30,0,45,30,0,60,0], borderColor:'#C9A84C', backgroundColor:'rgba(201,168,76,0.08)', fill:true, tension:0.4 },
        ]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins: { legend: { labels: { color:'#5C3A47', font:{family:'Inter',size:11} } } },
        scales: { x: { grid:{display:false}, ticks:{color:'#8B6070',font:{family:'Inter',size:11}} },
          y: { grid:{color:'#F0E8EB'}, ticks:{color:'#8B6070',font:{family:'Inter',size:11}} } } }
    });
  }
}
