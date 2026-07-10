// src/app/services/notification/toast.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { Toast, ToastType } from '../models/Toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;

  // État réactif avec signals
  private _notifications = signal<Toast[]>([]);

  // lecture publique en mode readonly
  readonly notifications = computed(() => this._notifications());

  private addToast(toast: Toast): void {
    this._notifications.update((list) => [...list, toast]);

    if (toast.duration! > 0) {
      setTimeout(() => this.dismiss(toast.id), toast.duration);
    }
  }

  private show(message: string, type: ToastType, title = '', duration = 8000): void {
    const toast: Toast = {
      id: ++this.counter,
      type,
      message,
      title,
      duration,
    };

    this.addToast(toast);
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  dismissAll(): void {
    this._notifications.set([]);
  }

  success(message: string, title = '', duration = 8000): void {
    this.show(message, 'success', title, duration);
  }

  error(message: string, title = '', duration = 9000): void {
    this.show(message, 'error', title, duration);
  }

  warning(message: string, title = '', duration = 8000): void {
    this.show(message, 'warning', title, duration);
  }

  info(message: string, title = '', duration = 8000): void {
    this.show(message, 'info', title, duration);
  }

  permanent(message: string, type: ToastType = 'info', title = ''): void {
    this.show(message, type, title, 0);
  }
}
