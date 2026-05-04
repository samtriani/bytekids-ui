import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
  @Input() title = 'Dashboard';
  @Input() subtitle = '';
  @Input() role: 'student' | 'teacher' | 'parent' | 'admin' | 'administrator' = 'student';
  @Input() userName = 'Usuario';
  @Input() userAvatar = 'U';

  roleColors: Record<string, string> = {
    student: '#00D4AA',
    teacher: '#9B59B6',
    parent: '#FF6B2B',
    admin: '#FFD93D',
    administrator: '#7A1535'
  };

  get color() {
    return this.roleColors[this.role];
  }

  today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}
