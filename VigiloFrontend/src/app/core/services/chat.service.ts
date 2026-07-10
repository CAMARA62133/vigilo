import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Conversation, Message } from '../models/chat.model';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private socket = inject(SocketService);
  private apiUrl = `${environment.apiUrl}/chats`;

  // SIGNALS (État réactif)
  public messages = signal<Message[]>([]);
  public activeConversation = signal<Conversation | null>(null);

  constructor() {
    // Utilisation d'un effect pour écouter les changements du signal newMessage
    // Dès que le socket reçoit un message, il met à jour le signal,
    // et cet effect met à jour notre liste locale de messages.
    effect(() => {
      const msg = this.socket.newMessage();
      if (msg && this.activeConversation()?.id === msg.conversationId) {
        this.messages.update((msgs) => [...msgs, msg]);
      }
    });
  }

  // --- ACTIONS ---

  loadMessages(conversationId: string, page = 1) {
    this.http
      .get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages?page=${page}`)
      .subscribe((msgs) => {
        this.messages.set(msgs);
        // On rejoint la room socket pour recevoir les futurs messages
        this.socket.joinConversation(conversationId);
      });
  }

  sendMessage(data: any) {
    // On n'a pas besoin de faire le .push() ici car le socket
    // va nous renvoyer le message via l'effect ci-dessus
    return this.http.post<Message>(`${this.apiUrl}/messages`, data);
  }

  markAsRead(messageId: string) {
    return this.http.patch(`${this.apiUrl}/messages/${messageId}/read`, {});
  }

  // Permet de changer la conversation active proprement
  setActiveConversation(conv: Conversation | null) {
    if (this.activeConversation()) {
      this.socket.leaveConversation(this.activeConversation()!.id);
    }
    this.activeConversation.set(conv);
    this.messages.set([]); // Reset pour éviter le mélange des messages
  }

  addParticipant(data: { conversationId: string; userId: string; role?: string }) {
    return this.http.post(`${this.apiUrl}/participants/add`, data);
  }

  removeParticipant(data: { conversationId: string; userId: string }) {
    return this.http.post(`${this.apiUrl}/participants/remove`, data);
  }
}
