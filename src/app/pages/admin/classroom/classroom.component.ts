import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell.component';
import { ADMIN_NAV } from '../shared/admin-nav';
import { SessionApiService } from '../../../services/api/session-api.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

const JAAS_APP_ID = 'vpaas-magic-cookie-7825138c95d24c7cb6f660d4a535d186';
const POLL_MS     = 10000;

@Component({
  selector: 'app-admin-classroom',
  standalone: true,
  imports: [CommonModule, ShellComponent],
  templateUrl: './classroom.component.html',
  styleUrls: ['./classroom.component.scss']
})
export class AdminClassroomComponent implements OnInit, OnDestroy {
  navItems   = ADMIN_NAV;
  userName   = 'Director';
  userAvatar = 'DR';

  scheduleId = '';
  status:     any = null;
  attendance: any[] = [];
  teacherVideoActive = false;
  activeMission: any = null;
  chatMessages: any[] = [];

  loading   = true;
  loadError = '';

  /** Modal de confirmación previo a entrar a la videollamada. */
  showJoinModal = false;
  videoMounted  = false;
  videoLoading  = false;

  activeTab: 'video' | 'chat' = 'video';

  private jitsiApi: any = null;
  private pollRef: any;

  constructor(
    private route:      ActivatedRoute,
    private router:     Router,
    private sessionApi: SessionApiService,
    private auth:       AuthService,
  ) {
    const u = this.auth.getUser();
    if (u) { this.userName = u.displayName; this.userAvatar = u.initials; }
  }

  get observerName(): string { return this.auth.getUser()?.displayName ?? 'Supervisión'; }

  get jitsiRoom(): string {
    return `${JAAS_APP_ID}/ByteKids-${this.scheduleId.replace(/-/g, '')}`;
  }

  get studentCount(): number {
    return this.attendance.filter(p => p.role === 'student').length;
  }

  ngOnInit() {
    this.scheduleId = this.route.snapshot.paramMap.get('scheduleId') ?? '';
    if (!this.scheduleId) {
      this.loadError = 'No se recibió el identificador de la clase.';
      this.loading   = false;
      return;
    }

    this.sessionApi.getStatus(this.scheduleId)
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        if (!data) this.loadError = 'No se pudo cargar la información de la clase.';
        this.status  = data;
        this.loading = false;
      });

    this.poll();
    this.pollRef = setInterval(() => this.poll(), POLL_MS);
  }

  ngOnDestroy() {
    clearInterval(this.pollRef);
    this.destroyJitsi();
  }

  private poll() {
    this.sessionApi.getAttendance(this.scheduleId)
      .pipe(catchError(() => of({ participants: [], teacherVideoActive: false })))
      .subscribe(data => {
        this.attendance         = data.participants ?? [];
        this.teacherVideoActive = data.teacherVideoActive ?? false;
      });

    this.sessionApi.getMission(this.scheduleId)
      .pipe(catchError(() => of(null)))
      .subscribe(m => this.activeMission = m);

    this.sessionApi.getChatMessages(this.scheduleId)
      .pipe(catchError(() => of([])))
      .subscribe(msgs => this.chatMessages = msgs);
  }

  // ── Videollamada (observador) ───────────────────────────────────────────

  askJoinVideo()  { this.showJoinModal = true; }
  cancelJoin()    { this.showJoinModal = false; }

  confirmJoin() {
    this.showJoinModal = false;
    this.activeTab     = 'video';
    this.videoLoading  = true;
    setTimeout(() => this.mountJitsi(), 200);
  }

  /**
   * Pide el token JaaS y monta el iframe. NO llama a join(): el admin nunca
   * queda registrado en class_sessions, así que no cuenta como asistencia.
   */
  private mountJitsi() {
    const container = document.getElementById('jitsi-admin');
    if (!container || this.jitsiApi) { this.videoLoading = false; return; }

    this.sessionApi.getJaasToken(this.scheduleId)
      .pipe(catchError(() => of(null)))
      .subscribe(jwt => {
        if (!jwt) {
          this.videoLoading = false;
          this.loadError    = 'No se pudo obtener el acceso a la videollamada.';
          return;
        }
        const load = () => {
          this.jitsiApi = new (window as any).JitsiMeetExternalAPI('8x8.vc', {
            roomName: this.jitsiRoom,
            parentNode: container,
            width: '100%', height: '100%',
            jwt,
            userInfo: { displayName: `${this.observerName} (Supervisión)` },
            configOverwrite: {
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              startWithAudioMuted: true,
              startWithVideoMuted: true,
            },
            interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
          });
          this.videoMounted = true;
          this.videoLoading = false;
        };

        if ((window as any).JitsiMeetExternalAPI) { load(); return; }
        const s = document.createElement('script');
        s.src    = `https://8x8.vc/${JAAS_APP_ID}/external_api.js`;
        s.onload = load;
        s.onerror = () => {
          this.videoLoading = false;
          this.loadError    = 'No se pudo cargar el reproductor de video.';
        };
        document.body.appendChild(s);
      });
  }

  private destroyJitsi() {
    if (this.jitsiApi) { this.jitsiApi.dispose(); this.jitsiApi = null; }
    this.videoMounted = false;
  }

  leaveVideo() {
    this.destroyJitsi();
  }

  exit() {
    this.destroyJitsi();
    this.router.navigate(['/admin/live']);
  }

  // ── Helpers de presentación ─────────────────────────────────────────────

  hhmm(time: string): string { return time ? time.substring(0, 5) : '—'; }

  roleLabel(role: string): string {
    return role === 'teacher' ? 'Maestro' : role === 'student' ? 'Alumno' : role;
  }
}
