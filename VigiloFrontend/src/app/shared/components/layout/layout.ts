import {
  Component,
  HostListener,
  inject,
  computed,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/services/auth.service';
import { MediaService } from '../../../core/services/media.service';
import { LogoComponent } from '../logo/logo';
import { ToastService } from '../../../core/services/toash.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Notifications } from '../../../core/models/notification.model';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  public notificationService = inject(NotificationService);
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);

  // ======================
  // SIGNALS
  // ======================
  notifications = signal<Notifications[]>([]);
  unreadCount = signal<number>(0);

  // Breadcrumb
  breadcrumbItems = signal<{ label: string; path?: string; active: boolean }[]>([]);

  isNotifMenuOpen = false;
  isUserMenuOpen = false;
  isSidebarOpen = false;

  sidebarCollapsed = signal(false);

  // ======================
  // USER
  // ======================
  currentUser = computed(() => this.authService.user());
  userRole = computed(() => this.currentUser()?.role || '');

  isSuperAdmin = computed(() => this.userRole() === 'super_admin');
  company = computed(() => this.currentUser()?.company);

  companyLogo = computed(() => {
    const logo = this.company()?.logo;
    if (!logo) return null;
    return this.mediaService.getMediaUrl(logo, 'logos');
  });

  // ======================
  // ROUTE MAP
  // ======================
  private routeMap: Record<string, { label: string; parent?: string; icon?: string }> = {
    dashboard: { label: 'Tableau de bord', icon: 'fa-gauge-high' },
    administration: { label: 'Administration', icon: 'fa-building-columns' },
    agents: { label: 'Agents', parent: 'Administration', icon: 'fa-user-shield' },
    sites: { label: 'Sites', parent: 'Administration', icon: 'fa-map-pin' },
    'detail-sites': { label: 'Détail du site', parent: 'Sites', icon: 'fa-location-dot' },
    plannings: { label: 'Planings', parent: 'Administration', icon: 'fa-calendar-days' },
    users: { label: 'Utilisateurs', parent: 'Administration', icon: 'fa-users' },
    entreprises: { label: 'Entreprises', parent: 'Administration', icon: 'fa-building' },
    surveillance: { label: 'Surveillance', icon: 'fa-video' },
    'check-in': { label: 'Pointage', icon: 'fa-fingerprint' },
    chats: { label: 'Messagerie', icon: 'fa-comments' },
    profil: { label: 'Profil', icon: 'fa-id-card' },
    abonnements: { label: 'Abonnements', parent: 'Administration', icon: 'fa-crown' },
    paiements: { label: 'Paiements', parent: 'Administration', icon: 'fa-credit-card' },
    'mon-abonnement': { label: 'Mon abonnement', icon: 'fa-crown' },
  };

  // ======================
  // INIT
  // ======================
  ngOnInit(): void {
    this.loadNotifications();
    this.initBreadcrumb();
  }

  // ======================
  // BREADCRUMB
  // ======================
  private initBreadcrumb() {
    // Mettre à jour au premier chargement
    this.updateBreadcrumb();

    // Écouter les changements de route
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateBreadcrumb();
      });
  }

  private updateBreadcrumb() {
    const url = this.router.url;
    const segments = url.split('/').filter((s) => s && !s.includes('?') && !s.includes('#'));

    const items: { label: string; path?: string; active: boolean }[] = [];

    // Toujours ajouter VIGILO (Accueil)
    items.push({
      label: 'VIGILO',
      path: '/dashboard',
      active: false,
    });

    // Construire le chemin dynamique
    let currentPath = '';
    let lastAddedParent = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Ignorer les IDs (paramètres numériques ou UUID)
      if (
        /^\d+$/.test(segment) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
      ) {
        continue;
      }

      currentPath += '/' + segment;
      const routeInfo = this.routeMap[segment];

      if (routeInfo) {
        const isLast = i === segments.length - 1;

        // Ajouter le parent si présent et pas déjà ajouté
        if (routeInfo.parent && routeInfo.parent !== lastAddedParent) {
          // Vérifier si le parent existe déjà dans les items
          const parentExists = items.some((item) => item.label === routeInfo.parent);
          if (!parentExists) {
            // Trouver le chemin du parent
            const parentPath = this.findParentPath(segments, routeInfo.parent);
            items.push({
              label: routeInfo.parent,
              path: parentPath || undefined,
              active: false,
            });
            lastAddedParent = routeInfo.parent;
          }
        }

        // Ajouter l'élément courant
        items.push({
          label: routeInfo.label,
          path: isLast ? undefined : currentPath,
          active: isLast,
        });
      }
    }

    // Si on a seulement "VIGILO", ajouter un élément par défaut
    if (items.length === 1) {
      items.push({
        label: 'Tableau de bord',
        path: '/dashboard',
        active: true,
      });
    }

    this.breadcrumbItems.set(items);
  }

  private findParentPath(segments: string[], parentLabel: string): string | null {
    let path = '';
    for (const segment of segments) {
      path += '/' + segment;
      const info = this.routeMap[segment];
      if (info && info.label === parentLabel) {
        return path;
      }
    }
    return null;
  }

  // ======================
  // LOAD NOTIFICATIONS
  // ======================
  loadNotifications() {
    this.notificationService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.notifications.set(res.data);
        }
      },
    });

    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        if (res.success) {
          this.unreadCount.set(res.data.count);
        }
      },
    });
  }

  // ======================
  // MARK AS READ
  // ======================
  markAsRead(id: string) {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );

        this.unreadCount.update((count) => Math.max(0, count - 1));

        this.toastService.success('Notification lue');
      },
    });
  }

  // ======================
  // MARK ALL AS READ
  // ======================
  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));

        this.unreadCount.set(0);

        this.toastService.success('Toutes les notifications sont lues');
      },
    });
  }

  // ======================
  // DELETE ONE
  // ======================
  deleteNotification(id: string) {
    this.notificationService.deleteOne(id).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== id));

        this.toastService.success('Notification supprimée');
        this.loadNotifications();
      },
    });
  }

  // DELETE ALL
  deleteAllNotifications() {
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.toastService.success('Toutes les notifications supprimées');
      },
    });
  }

  // ======================
  // AUTH
  // ======================
  onLogout(): void {
    this.authService.logout();
    this.toastService.info('Vous avez été déconnecté');
  }

  hasRole(allowedRoles: string[]): boolean {
    const role = this.userRole();
    return role ? allowedRoles.includes(role) : false;
  }

  // ======================
  // USER ACTIVITY
  // ======================
  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:click')
  refreshUserActivity() {
    this.authService.resetInactivityTimer();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    if (!target.closest('.relative')) {
      this.isNotifMenuOpen = false;
      this.isUserMenuOpen = false;
    }
  }

  // ======================
  // UI
  // ======================
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleSidebarCollapse(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotifMenuOpen = false;
  }

  toggleNotifMenu(event: Event): void {
    event.stopPropagation();
    this.isNotifMenuOpen = !this.isNotifMenuOpen;
    this.isUserMenuOpen = false;
  }
}
