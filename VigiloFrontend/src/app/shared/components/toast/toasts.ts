import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast } from '../../../core/models/Toast.model';
import { ToastService } from '../../../core/services/toash.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toasts.html',
  styleUrl: "./toasts.scss"
})
export class Toasts {
  private toastService = inject(ToastService);

  notifications = computed(() => this.toastService.notifications());

  closingIds = signal<Set<number>>(new Set());

  close(id: number) {
    this.closingIds.update((set) => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });

    setTimeout(() => {
      this.toastService.dismiss(id);

      this.closingIds.update((set) => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }, 250);
  }

  trackById(_: number, n: Toast) {
    return n.id;
  }

  isClosing(id: number): boolean {
    return this.closingIds().has(id);
  }
}
