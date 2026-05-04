import { Injectable } from '@angular/core';

export interface MissionProgress {
  progress: number;
  status: 'Disponible' | 'En progreso' | 'Completado';
}

@Injectable({ providedIn: 'root' })
export class MissionStateService {
  private state: Record<string, MissionProgress> = {};

  get(title: string): MissionProgress | null {
    return this.state[title] ?? null;
  }

  complete(title: string) {
    this.state[title] = { progress: 100, status: 'Completado' };
  }

  start(title: string) {
    if (!this.state[title]) {
      this.state[title] = { progress: 30, status: 'En progreso' };
    }
  }
}
