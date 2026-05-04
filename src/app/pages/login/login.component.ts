import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  showPwd = false;
  loading = false;
  error = '';
  shake = false;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) this.router.navigate(['/portal']);
  }

  async submit() {
    if (!this.username.trim() || !this.password) {
      this.triggerError('Completa usuario y contraseña');
      return;
    }
    this.loading = true;
    this.error = '';
    const result = await this.auth.login(this.username.trim(), this.password);
    this.loading = false;
    if (result.ok) {
      this.router.navigate(['/portal']);
    } else {
      this.triggerError(result.error || 'Error de autenticación');
    }
  }

  triggerError(msg: string) {
    this.error = msg;
    this.shake = true;
    setTimeout(() => this.shake = false, 500);
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') this.submit();
  }
}
