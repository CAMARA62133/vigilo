import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgentService } from '../../core/services/agent.service';
import { SiteService } from '../../core/services/site.service';
import { PlanningService } from '../../core/services/planning.service';
import { Agent } from '../../core/models/Agent.model';
import { Site } from '../../core/models/Site.model';
import { Planning, PlanningStatus } from '../../core/models/Planning.model';
import { ToastService } from '../../core/services/toash.service';

@Component({
  selector: 'app-plannings',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './plannings.html',
})
export class Plannings implements OnInit {
  private agentService = inject(AgentService);
  private siteService = inject(SiteService);
  private planningService = inject(PlanningService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  view = signal<'week' | 'month' | 'list'>('week');

  agents = signal<Agent[]>([]);
  sites = signal<Site[]>([]);
  plannings = signal<Planning[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  showFormModal = signal(false);
  showDetailModal = signal(false);
  isEditMode = signal(false);
  selectedPlanning = signal<Planning | null>(null);

  planningForm!: FormGroup;

  // Créneaux horaires pour la vue semaine (comme dans l'image)
  timeSlots: string[] = [
    '06:00',
    '08:00',
    '10:00',
    '12:00',
    '14:00',
    '16:00',
    '18:00',
    '20:00',
    '22:00',
    '00:00',
  ];

  stats = signal({
    completionRate: 0,
    pending: 0,
    completed: 0,
    active: 0,
  });

  filters = {
    datePreset: 'week' as 'today' | 'week' | 'month' | 'custom',
    startDate: '',
    endDate: '',
    agentId: '',
    siteId: '',
    status: '' as PlanningStatus | '',
  };

  currentDate = signal(new Date());
  calendarDays = signal<
    Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      plannings: Planning[];
    }>
  >([]);

  weekStart = signal(new Date());
  weekAgents = signal<Agent[]>([]);
  weekDays = signal<Array<{ dateString: string; dayName: string; dayNumber: number }>>([]);

  private monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  private dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  periodLabel = computed(() => {
    const date = this.currentDate();
    if (this.view() === 'week') {
      const start = this.getWeekStart(date);
      const end = this.getWeekEnd(start);
      return `${start.getDate()} – ${end.getDate()} ${this.monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${this.monthNames[date.getMonth()]} ${date.getFullYear()}`;
  });

  weekStartLabel = computed(() => {
    const start = this.getWeekStart(this.currentDate());
    return `${start.getDate()} ${this.monthNames[start.getMonth()]}`;
  });

  weekEndLabel = computed(() => {
    const start = this.getWeekStart(this.currentDate());
    const end = this.getWeekEnd(start);
    return `${end.getDate()} ${this.monthNames[end.getMonth()]}`;
  });

  filteredPlannings = computed(() => {
    const all = this.plannings();
    let filtered = all;

    if (this.filters.agentId) {
      filtered = filtered.filter((p) => p.agentId === this.filters.agentId);
    }
    if (this.filters.siteId) {
      filtered = filtered.filter((p) => p.siteId === this.filters.siteId);
    }
    if (this.filters.status) {
      filtered = filtered.filter((p) => p.status === this.filters.status);
    }

    // Utiliser les dates de la période actuelle
    if (this.view() === 'list') {
      // Pour la liste, on utilise les dates de la période affichée
      const start = this.getPeriodStart();
      const end = this.getPeriodEnd();
      if (start && end) {
        filtered = filtered.filter((p) => p.workDate >= start && p.workDate <= end);
      }
    } else {
      // Pour week et month, on utilise le filtre datePreset
      const now = new Date();
      if (this.filters.datePreset === 'today') {
        const todayStr = this.formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter((p) => p.workDate === todayStr);
      } else if (this.filters.datePreset === 'week') {
        const start = this.getWeekStart(now);
        const end = this.getWeekEnd(start);
        const startStr = this.formatDateString(
          start.getFullYear(),
          start.getMonth(),
          start.getDate(),
        );
        const endStr = this.formatDateString(end.getFullYear(), end.getMonth(), end.getDate());
        filtered = filtered.filter((p) => p.workDate >= startStr && p.workDate <= endStr);
      } else if (this.filters.datePreset === 'month') {
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = this.formatDateString(year, month, 1);
        const lastDay = this.formatDateString(year, month + 1, 0);
        filtered = filtered.filter((p) => p.workDate >= firstDay && p.workDate <= lastDay);
      }
    }

    return filtered;
  });

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  initForm() {
    this.planningForm = this.fb.group({
      id: [''],
      agentId: ['', Validators.required],
      siteId: ['', Validators.required],
      workDate: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      gpsFrequencySeconds: [30, [Validators.required, Validators.min(5), Validators.max(300)]],
      roundFrequencyMinutes: [60, [Validators.required, Validators.min(5), Validators.max(240)]],
      maxIdleMinutes: [30, [Validators.required, Validators.min(5), Validators.max(120)]],
    });
  }

  loadData() {
    this.isLoading.set(true);

    this.agentService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.agents.set(response.data || []);
          this.updateWeekAgents();
        },
        error: () => this.toastService.error('Erreur lors du chargement des agents'),
      });

    this.siteService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.sites.set(response.data || []),
        error: () => this.toastService.error('Erreur lors du chargement des sites'),
      });

    this.loadPlannings();
  }

  loadPlannings() {
    this.isLoading.set(true);
    const { status, ...filtersWithoutStatus } = this.filters;

    // Construire les paramètres de requête
    let queryParams: any = { ...filtersWithoutStatus };

    // Ajouter les dates de début et fin en fonction de la vue
    const startDate = this.getPeriodStart();
    const endDate = this.getPeriodEnd();

    if (startDate && endDate) {
      queryParams.startDate = startDate;
      queryParams.endDate = endDate;
    }

    if (status !== '') {
      queryParams.status = status;
    }

    this.planningService
      .getAll(queryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.plannings.set(response.data || []);
          this.generateCalendar();
          this.generateWeek();
          this.calculateStats();
          this.isLoading.set(false);
        },
        error: () => {
          this.toastService.error('Erreur lors du chargement des plannings');
          this.isLoading.set(false);
        },
      });
  }

  // Récupère la date de début de la période actuelle
  private getPeriodStart(): string {
    const date = this.currentDate();
    if (this.view() === 'week') {
      const start = this.getWeekStart(date);
      return this.formatDateString(start.getFullYear(), start.getMonth(), start.getDate());
    } else {
      const year = date.getFullYear();
      const month = date.getMonth();
      return this.formatDateString(year, month, 1);
    }
  }

  // Récupère la date de fin de la période actuelle
  private getPeriodEnd(): string {
    const date = this.currentDate();
    if (this.view() === 'week') {
      const start = this.getWeekStart(date);
      const end = this.getWeekEnd(start);
      return this.formatDateString(end.getFullYear(), end.getMonth(), end.getDate());
    } else {
      const year = date.getFullYear();
      const month = date.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      return this.formatDateString(year, month, lastDay);
    }
  }

  calculateStats() {
    const allPlannings = this.plannings();
    const total = allPlannings.length;
    const completed = allPlannings.filter((p) => p.status === 'completed').length;
    const pending = allPlannings.filter((p) => p.status === 'pending').length;
    const active = this.agents().filter((a) => a.status === 'working').length;

    this.stats.set({
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      pending,
      completed,
      active,
    });
  }

  setView(view: 'week' | 'month' | 'list') {
    this.view.set(view);

    // Mettre à jour le filtre de période
    if (view === 'week') {
      this.filters.datePreset = 'week';
    } else if (view === 'month') {
      this.filters.datePreset = 'month';
    }
    // Pour 'list', on garde le filtre précédent

    this.refreshView();
  }

  previousPeriod() {
    this.currentDate.update((date) => {
      if (this.view() === 'week') {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
      }
      return new Date(date.getFullYear(), date.getMonth() - 1, 1);
    });
    this.refreshView();
  }

  nextPeriod() {
    this.currentDate.update((date) => {
      if (this.view() === 'week') {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
      }
      return new Date(date.getFullYear(), date.getMonth() + 1, 1);
    });
    this.refreshView();
  }

  goToToday() {
    this.currentDate.set(new Date());
    this.refreshView();
  }

  private refreshView() {
    // Recharger les données avec la nouvelle période
    this.loadPlannings();

    if (this.view() === 'week') {
      this.generateWeek();
      this.updateWeekAgents();
    } else if (this.view() === 'month') {
      this.generateCalendar();
    }
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getWeekEnd(start: Date): Date {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }

  private updateWeekAgents() {
    const allAgents = this.agents();
    const start = this.getWeekStart(this.currentDate());
    const end = this.getWeekEnd(start);
    const startStr = this.formatDateString(start.getFullYear(), start.getMonth(), start.getDate());
    const endStr = this.formatDateString(end.getFullYear(), end.getMonth(), end.getDate());

    const weekPlannings = this.plannings().filter(
      (p) => p.workDate >= startStr && p.workDate <= endStr && p.status !== 'cancelled',
    );
    const agentIds = new Set(weekPlannings.map((p) => p.agentId));
    this.weekAgents.set(allAgents.filter((a) => agentIds.has(a.id)));
  }

  private generateWeek() {
    const start = this.getWeekStart(this.currentDate());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      days.push({
        dateString: this.formatDateString(date.getFullYear(), date.getMonth(), date.getDate()),
        dayName: this.dayNames[i],
        dayNumber: date.getDate(),
      });
    }
    this.weekDays.set(days);
    this.updateWeekAgents();
  }

  getPlanningsForAgentDay(agentId: string, dateStr: string): Planning[] {
    return this.plannings()
      .filter((p) => p.agentId === agentId && p.workDate === dateStr && p.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Récupère les plannings pour une heure spécifique (pour les lignes d'heures)
  getPlanningsForAgentDayAndHour(agentId: string, dateStr: string, hour: string): Planning[] {
    return this.plannings()
      .filter((p) => p.workDate === dateStr && p.status !== 'cancelled' && p.startTime === hour)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getWeekStatusClass(status: PlanningStatus, startTime: string): string {
    const hour = parseInt(startTime.split(':')[0]);
    const isNight = hour >= 20 || hour < 6;
    if (status === 'cancelled')
      return 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 line-through border border-slate-300 dark:border-slate-600';
    if (status === 'completed')
      return isNight
        ? 'bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
        : 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
    if (status === 'active')
      return isNight
        ? 'bg-amber-300 dark:bg-amber-700/60 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-600'
        : 'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
    if (status === 'missed')
      return 'bg-rose-200 dark:bg-rose-800/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700';
    return isNight
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
  }

  private formatDateString(year: number, month: number, day: number): string {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  generateCalendar() {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const days: any[] = [];

    const prevMonthDate = new Date(year, month - 1, 1);
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dateStr = this.formatDateString(
        prevMonthDate.getFullYear(),
        prevMonthDate.getMonth(),
        dayNum,
      );
      const cellDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), dayNum);
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: this.isSameDay(cellDate, today),
        plannings: this.getPlanningsForDate(dateStr),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = this.formatDateString(year, month, i);
      const cellDate = new Date(year, month, i);
      days.push({
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: this.isSameDay(cellDate, today),
        plannings: this.getPlanningsForDate(dateStr),
      });
    }

    const totalSlots = 42;
    const remaining = totalSlots - days.length;
    const nextMonthDate = new Date(year, month + 1, 1);

    for (let i = 1; i <= remaining; i++) {
      const dateStr = this.formatDateString(
        nextMonthDate.getFullYear(),
        nextMonthDate.getMonth(),
        i,
      );
      const cellDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), i);
      days.push({
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: this.isSameDay(cellDate, today),
        plannings: this.getPlanningsForDate(dateStr),
      });
    }

    this.calendarDays.set(days);
  }

  getPlanningsForDate(dateStr: string): Planning[] {
    return this.plannings().filter((p) => p.workDate === dateStr && p.status !== 'cancelled');
  }

  getAgentName(agentId: string): string {
    const agent = this.agents().find((a) => a.id === agentId);
    return agent?.user?.fullname || 'Agent inconnu';
  }

  getSiteName(siteId: string): string {
    const site = this.sites().find((s) => s.id === siteId);
    return site?.name || 'Site inconnu';
  }

  getAgentDetails(agentId: string): Agent | undefined {
    return this.agents().find((a) => a.id === agentId);
  }

  getStatusClass(status: PlanningStatus): string {
    const classes: Record<PlanningStatus, string> = {
      pending:
        'bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-l-4 border-l-amber-500 dark:border-l-amber-400',
      active:
        'bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-l-4 border-l-blue-500 dark:border-l-blue-400',
      completed:
        'bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
      missed:
        'bg-rose-100/70 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-l-4 border-l-rose-500 dark:border-l-rose-400',
      cancelled:
        'bg-slate-100/50 dark:bg-slate-700/30 text-slate-400 dark:text-slate-500 border-l-4 border-l-slate-400 dark:border-l-slate-500 line-through',
    };
    return (
      classes[status] ||
      'bg-slate-100/70 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border-l-4 border-l-slate-400'
    );
  }

  applyFilters() {
    this.loadPlannings();
  }

  openCreateModal() {
    this.isEditMode.set(false);
    this.planningForm.reset({
      gpsFrequencySeconds: 30,
      roundFrequencyMinutes: 60,
      maxIdleMinutes: 30,
    });
    this.showFormModal.set(true);
  }

  openEditModal(planning: Planning, event: Event) {
    event.stopPropagation();
    this.isEditMode.set(true);
    this.planningForm.patchValue({
      id: planning.id,
      agentId: planning.agentId,
      siteId: planning.siteId,
      workDate: planning.workDate,
      startTime: planning.startTime,
      endTime: planning.endTime,
      gpsFrequencySeconds: planning.gpsFrequencySeconds,
      roundFrequencyMinutes: planning.roundFrequencyMinutes,
      maxIdleMinutes: planning.maxIdleMinutes,
    });
    this.showFormModal.set(true);
  }

  openDetailModal(planning: Planning) {
    this.selectedPlanning.set(planning);
    this.showDetailModal.set(true);
  }

  savePlanning() {
    if (this.planningForm.invalid) {
      this.toastService.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.planningForm.value;

    if (this.isEditMode()) {
      this.planningService
        .update(formValue.id, formValue)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toastService.success('Planning modifié avec succès');
            this.loadPlannings();
            this.closeModals();
            this.isSaving.set(false);
          },
          error: (err) => {
            this.toastService.error(err.error?.message || 'Erreur lors de la modification');
            this.isSaving.set(false);
          },
        });
    } else {
      this.planningService
        .create(formValue)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toastService.success('Planning créé avec succès');
            this.loadPlannings();
            this.closeModals();
            this.isSaving.set(false);
          },
          error: (err) => {
            this.toastService.error(err.error?.message || 'Erreur lors de la création');
            this.isSaving.set(false);
          },
        });
    }
  }

  cancelPlanning(id: string) {
    this.planningService
      .cancel(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Planning annulé avec succès');
          this.loadPlannings();
        },
        error: (err) => {
          this.toastService.error(err.error?.message || "Erreur lors de l'annulation");
        },
      });
  }

  closeModals() {
    this.showFormModal.set(false);
    this.showDetailModal.set(false);
    this.selectedPlanning.set(null);
  }

  exportList() {
    this.toastService.success('Export de la liste en cours...');
  }
}
