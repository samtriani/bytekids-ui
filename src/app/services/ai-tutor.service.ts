import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type TutorRole = 'student' | 'teacher' | 'parent' | 'admin';
export interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp: Date; }

interface AiResponse { success: boolean; data: string; }

@Injectable({ providedIn: 'root' })
export class AiTutorService {

  constructor(private http: HttpClient) {}

  async sendMessage(messages: ChatMessage[], _role: TutorRole, userMessage: string): Promise<string> {
    const body = {
      message: userMessage,
      history: messages.map(m => ({ role: m.role, content: m.content }))
    };

    try {
      const res = await firstValueFrom(
        this.http.post<AiResponse>(`${environment.apiUrl}/ai-tutor/chat`, body)
      );
      return res.data ?? '¡Ups! Respuesta vacía. Intenta de nuevo 🔧';
    } catch {
      return '¡Ups! No pude conectarme con ByteBot. Verifica tu conexión e intenta de nuevo 🔧';
    }
  }
}
