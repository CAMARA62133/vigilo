// core/services/socket.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Message } from '../models/chat.model';

export interface GpsLiveData {
  agentId: string;
  agentName: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  workSessionId: string;
  siteId: string;
  siteName: string;
  distanceMoved: number;
  totalDistanceKm: number;
  timestamp: Date;
}

export interface CheckpointValidatedData {
  checkpointId: string;
  name: string;
  agentId: string;
}

export interface AlertLiveData {
  type: 'outside_geofence' | 'idle' | 'emergency';
  agentId: string;
  distance?: number;
  message?: string;
}

export interface SessionEndedData {
  sessionId: string;
  agentId: string;
  agentName: string;
  endedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  // Signaux réactifs
  public isConnected = signal<boolean>(false);

  // Signaux GPS
  public lastGpsUpdate = signal<GpsLiveData | null>(null);
  public gpsUpdates = signal<GpsLiveData[]>([]);

  // Signaux Notifications
  public lastNotification = signal<any | null>(null);

  // Signaux Checkpoints
  public checkpointValidated = signal<CheckpointValidatedData | null>(null);

  // Signaux Alertes
  public alertLive = signal<AlertLiveData | null>(null);

  // Signaux Session
  public sessionEnded = signal<SessionEndedData | null>(null);

  // Signaux Chat
  public newMessage = signal<Message | null>(null);
  public typingUser = signal<any | null>(null);
  public readReceipt = signal<any | null>(null);

  connect(userId: string, companyId: string, role: string, agentId?: string): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connecté');
      this.isConnected.set(true);
      this.socket?.emit('register', { userId, companyId, role, agentId });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected.set(false);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket déconnecté');
      this.isConnected.set(false);
    });

    // --- GPS LIVE ---
    this.socket.on('gps_live', (data: GpsLiveData) => {
      this.lastGpsUpdate.set(data);
      this.gpsUpdates.update((updates) => [...updates.slice(-99), data]);
    });

    // --- NOTIFICATIONS ---
    this.socket.on('notification', (data) => {
      this.lastNotification.set(data);
    });

    // --- CHECKPOINT VALIDATED ---
    this.socket.on('checkpoint_validated', (data: CheckpointValidatedData) => {
      this.checkpointValidated.set(data);
    });

    // --- ALERT LIVE ---
    this.socket.on('alert_live', (data: AlertLiveData) => {
      this.alertLive.set(data);
    });

    // --- SESSION ENDED ---
    this.socket.on('session_ended', (data: SessionEndedData) => {
      this.sessionEnded.set(data);
    });

    // --- CHAT ---
    this.socket.on('new_message', (msg: Message) => this.newMessage.set(msg));
    this.socket.on('typing', (data) => this.typingUser.set(data));
    this.socket.on('message_read', (data) => this.readReceipt.set(data));
  }

  // --- GPS METHODS ---
  sendGpsUpdate(data: { latitude: number; longitude: number; accuracy?: number; speed?: number }) {
    this.socket?.emit('gps_update', data);
  }

  // --- CHAT METHODS ---
  sendMessage(data: { conversationId: string; text: string }) {
    this.socket?.emit('send_message', data);
  }

  joinConversation(id: string) {
    this.socket?.emit('join_conversation', id);
  }

  leaveConversation(id: string) {
    this.socket?.emit('leave_conversation', id);
  }

  emitTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  // --- NOTIFICATION ---
  sendNotification(data: any) {
    this.socket?.emit('notification', data);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected.set(false);
  }

  clearNewMessage() {
    this.newMessage.set(null);
  }

  clearCheckpointValidated() {
    this.checkpointValidated.set(null);
  }

  clearAlertLive() {
    this.alertLive.set(null);
  }

  clearSessionEnded() {
    this.sessionEnded.set(null);
  }
}
