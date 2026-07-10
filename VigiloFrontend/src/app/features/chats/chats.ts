// chats.component.ts
import {
  Component,
  signal,
  computed,
  AfterViewInit,
  OnInit,
  OnDestroy,
  inject,
  effect,
  Injector,
  untracked,
} from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Conversation, Message } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { UserService } from '../../core/services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './chats.html',
  styleUrls: ['./chats.scss'],
})
export class Chats implements OnInit, AfterViewInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private injector = inject(Injector);

  // États
  selectedConversation = signal<Conversation | null>(null);
  showNewMessageModal = signal(false);
  showFilePreviewModal = signal(false);
  selectedFile = signal<any | null>(null);
  searchQuery = signal('');
  showEmojiPicker = signal(false);
  showGeolocationModal = signal(false);
  currentGeolocation = signal<{ lat: number; lng: number; address: string } | null>(null);
  isLoading = signal(true);
  isLoadingMessages = signal(false);
  availableUsers = signal<any[]>([]);

  // Formulaire réactif pour nouvelle conversation
  conversationForm: FormGroup = this.fb.group({
    type: ['INDIVIDUEL', Validators.required],
    scope: ['SITE'],
    message: [''],
    name: [''],
    participants: [[]],
  });

  // Formulaire pour le message
  messageForm: FormGroup = this.fb.group({
    content: ['', Validators.required],
  });

  // Formulaire pour la recherche d'utilisateurs
  searchForm: FormGroup = this.fb.group({
    query: [''],
  });

  // Computed values
  conversations = computed(() => this.chatService.messages()); // Note: à adapter selon votre ChatService
  messages = computed(() => this.chatService.messages());

  totalUnreadCount = computed(() => {
    return 0; // À implémenter selon votre logique
  });

  urgentConversations = computed(() => {
    return []; // À implémenter selon votre logique
  });

  filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return [];
  });

  currentMessages = computed(() => {
    const conv = this.selectedConversation();
    if (!conv) return [];
    return this.chatService.messages().filter((msg) => msg.conversationId === conv.id);
  });

  filteredUsers = computed(() => {
    const query = this.searchForm.get('query')?.value?.toLowerCase().trim() || '';
    if (!query) return this.availableUsers();
    return this.availableUsers().filter(
      (user: any) =>
        user.fullname?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query),
    );
  });

  currentUser = computed(() => this.authService.user());

  ngOnInit() {
    this.loadConversations();
    // this.initRealtime();
    this.loadAvailableUsers();

    // Effet pour scroll automatique
    effect(() => {
      this.currentMessages();
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 100);
  }

  ngOnDestroy() {
    const conv = this.selectedConversation();
    if (conv) {
      this.socketService.leaveConversation(conv.id);
    }

    // ATTENTION : Ne déconnectez le socket que si ce composant est le seul
    // responsable de la connexion. Si le service est utilisé ailleurs,
    // supprimez cette ligne.
    this.socketService.disconnect();
  }

  constructor() {
    this.initRealtime();
  }

  initRealtime() {
    const currentUser = this.currentUser();
    if (currentUser) {
      this.socketService.connect(
        currentUser.id,
        currentUser.companyId || '',
        currentUser.role,
        currentUser.id,
      );
    }

    // Effet pour surveiller les nouveaux messages
    effect(
      () => {
        const message = this.socketService.newMessage();
        const conv = this.selectedConversation();

        // On utilise untracked() pour éviter que des changements de 'conv'
        // ne déclenchent l'effet inutilement, on ne veut réagir qu'à 'message'
        untracked(() => {
          if (message && conv && message.conversationId === conv.id) {
            if (message.senderId !== currentUser?.id) {
              this.markMessageAsRead(message.id, conv.id);
            }

            setTimeout(() => this.scrollToBottom(), 0);

            // Optionnel : on vide le signal pour éviter les répétitions
            this.socketService.clearNewMessage();
          }
        });
      },
      { injector: this.injector },
    );
  }
  loadConversations() {
    this.isLoading.set(true);
    // À implémenter selon votre API
    this.isLoading.set(false);
  }

  loadAvailableUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.availableUsers.set(users);
      },
      error: (err) => {
        console.error('Error loading users:', err);
      },
    });
  }


  createConversation() {
    const currentUser = this.currentUser();
    if (!currentUser || this.conversationForm.invalid) return;

    const formValue = this.conversationForm.value;
    let participants: { userId: string; role?: string }[] = [];

    if (formValue.type === 'INDIVIDUEL') {
      participants = formValue.participants.map((id: string) => ({
        userId: id,
        role: 'MEMBER',
      }));
    } else {
      participants = this.availableUsers().map((user: any) => ({
        userId: user.id,
        role: 'MEMBER',
      }));
    }

    const payload = {
      name: this.buildConversationName(),
      type: formValue.type,
      siteId: formValue.scope === 'SITE' ? 'site-123' : undefined,
      participants: participants,
      initialMessage: formValue.message || undefined,
    };

    // À implémenter avec votre ChatService
    this.resetForm();
    this.showNewMessageModal.set(false);
  }

  buildConversationName(): string {
    const formValue = this.conversationForm.value;
    if (formValue.type === 'URGENCE') {
      return '🚨 Urgence';
    }
    if (formValue.scope === 'SITE') {
      return 'Groupe Site';
    }
    if (formValue.scope === 'COMPANY') {
      return 'Groupe Entreprise';
    }
    if (formValue.participants.length === 1) {
      const user = this.availableUsers().find((u: any) => u.id === formValue.participants[0]);
      return user?.fullname || 'Conversation';
    }
    return formValue.name || 'Conversation';
  }

  resetForm() {
    this.conversationForm.reset({
      type: 'INDIVIDUEL',
      scope: 'SITE',
      message: '',
      name: '',
      participants: [],
    });
    this.searchForm.reset({ query: '' });
  }

  addParticipant(userId: string) {
    const participants = this.conversationForm.get('participants')?.value || [];
    if (!participants.includes(userId)) {
      this.conversationForm.patchValue({ participants: [...participants, userId] });
    }
  }

  removeParticipant(userId: string) {
    const participants = this.conversationForm.get('participants')?.value || [];
    this.conversationForm.patchValue({
      participants: participants.filter((id: string) => id !== userId),
    });
  }

  getParticipantName(userId: string): string {
    const user = this.availableUsers().find((u: any) => u.id === userId);
    return user?.fullname || userId;
  }

  sendMessage() {
    const conv = this.selectedConversation();
    const currentUser = this.currentUser();
    if (!conv || this.messageForm.invalid || !currentUser) return;

    const content = this.messageForm.get('content')?.value;
    const isUrgent = conv.type === 'URGENCE';

    this.chatService
      .sendMessage({
        conversationId: conv.id,
        content: content,
        type: isUrgent ? 'URGENCE' : 'TEXTE',
        isUrgent: isUrgent,
      })
      .subscribe({
        next: () => {
          this.messageForm.reset({ content: '' });
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => console.error('Error sending message:', err),
      });
  }

  sendGeolocation() {
    const conv = this.selectedConversation();
    const currentUser = this.currentUser();
    if (!conv || !currentUser) return;

    this.chatService
      .sendMessage({
        conversationId: conv.id,
        type: 'GEOLOCALISATION',
        geolocation: this.currentGeolocation(),
      })
      .subscribe({
        next: () => {
          this.showGeolocationModal.set(false);
          this.currentGeolocation.set(null);
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => console.error('Error sending geolocation:', err),
      });
  }

  onFileSelected(event: any, type: 'IMAGE' | 'FICHIER') {
    const conv = this.selectedConversation();
    const currentUser = this.currentUser();
    if (!conv || !currentUser) return;

    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 10MB)');
      return;
    }

    const attachment = {
      id: 'att-' + Date.now(),
      name: file.name,
      url: URL.createObjectURL(file),
      thumbnailUrl: type === 'IMAGE' ? URL.createObjectURL(file) : undefined,
      type: file.type,
      size: file.size,
    };

    this.chatService
      .sendMessage({
        conversationId: conv.id,
        type: type,
        attachments: [attachment],
      })
      .subscribe({
        next: () => {
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => console.error('Error sending file:', err),
      });

    event.target.value = '';
  }

  markMessageAsRead(messageId: string, conversationId: string) {
    this.chatService.markAsRead(messageId).subscribe({
      next: () => {
        // Mettre à jour le compteur
      },
      error: (err) => console.error('Error marking message as read:', err),
    });
  }

  selectConversation(conversation: Conversation) {
    this.selectedConversation.set(conversation);
    this.socketService.joinConversation(conversation.id);
    this.isLoadingMessages.set(true);

    this.chatService.loadMessages(conversation.id);
    this.isLoadingMessages.set(false);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  previewFile(message: Message) {
    if (message.attachments && message.attachments.length > 0) {
      this.selectedFile.set(message.attachments[0]);
      this.showFilePreviewModal.set(true);
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  formatMessageTime(date: string | Date): string {
    const messageDate = new Date(date);
    const now = new Date();

    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    const diff = now.getTime() - messageDate.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;

    return messageDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  formatDateHeader(date: string | Date): string {
    const messageDate = new Date(date);
    const now = new Date();

    if (messageDate.toDateString() === now.toDateString()) {
      return "Aujourd'hui";
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }

    return messageDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  getInitial(name: string): string {
    return name?.charAt(0).toUpperCase() || '?';
  }

  getAvatarColor(name: string): string {
    const colors = [
      'from-cyan-500 to-cyan-600',
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-green-500',
      'from-amber-500 to-orange-500',
      'from-purple-500 to-violet-500',
      'from-blue-500 to-indigo-500',
    ];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
  }

  isCurrentUser(senderId: string): boolean {
    return senderId === this.currentUser()?.id;
  }

  getMessageStatusIcon(status: string): string {
    switch (status) {
      case 'ENVOYÉ':
        return 'fa-check text-slate-300';
      case 'LIVRÉ':
        return 'fa-check-double text-slate-400';
      case 'LU':
        return 'fa-check-double text-cyan-500';
      default:
        return 'fa-check text-slate-300';
    }
  }

  getFileIcon(type: string): string {
    if (type?.includes('pdf')) return 'fa-file-pdf text-red-500';
    if (type?.includes('word') || type?.includes('document')) return 'fa-file-word text-blue-500';
    if (type?.includes('excel') || type?.includes('sheet')) return 'fa-file-excel text-green-500';
    if (type?.includes('image')) return 'fa-file-image text-purple-500';
    if (type?.includes('zip') || type?.includes('archive')) return 'fa-file-zipper text-amber-500';
    return 'fa-file text-slate-500';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentGeolocation.set({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Position actuelle',
          });
          this.sendGeolocation();
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert("Impossible d'obtenir votre position");
        },
      );
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
    }
  }

  groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return Object.keys(groups).map((date) => ({
      date,
      messages: groups[date],
    }));
  }

  openLocation(lat: number, lng: number) {
    const url = `https://maps.google.com?q=${lat},${lng}`;
    window.open(url, '_blank');
  }
}
