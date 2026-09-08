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

  /**
   * El backend duerme cuando no se usa (Fly con auto_stop) y la base de Neon
   * tambien, asi que el primer login del dia despierta a los dos y tarda. Sin
   * avisar, el usuario ve un spinner mudo hasta medio minuto y cree que trono.
   * Estos mensajes aparecen escalonados mientras se espera.
   */
  espera = '';
  private temporizadores: any[] = [];

  private iniciarAvisos() {
    this.espera = '';
    this.temporizadores = [
      setTimeout(() => this.espera = 'Despertando a Bytebot🤖… la primera vez del día tarda un poco.', 2500),
      setTimeout(() => this.espera = 'Sigue arrancando. Ya casi, no cierres esta página.', 9000),
      setTimeout(() => this.espera = 'Está tardando más de lo normal. Si no entra, vuelve a intentar.', 20000),
    ];
  }

  private detenerAvisos() {
    this.temporizadores.forEach(clearTimeout);
    this.temporizadores = [];
    this.espera = '';
  }

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
    this.iniciarAvisos();
    const result = await this.auth.login(this.username.trim(), this.password);
    this.detenerAvisos();
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
