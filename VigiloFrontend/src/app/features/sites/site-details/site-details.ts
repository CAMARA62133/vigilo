// site-details.component.ts
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { lastValueFrom, Subscription } from 'rxjs';
import { Site } from '../../../core/models/Site.model';
import { Checkpoint } from '../../../core/models/Checkpoint.model';
import { Agent } from '../../../core/models/Agent.model';
import { Planning } from '../../../core/models/Planning.model';
import { CheckpointService } from '../../../core/services/checkpoint.service';
import { SiteService } from '../../../core/services/site.service';
import { AgentService } from '../../../core/services/agent.service';
import { PlanningService } from '../../../core/services/planning.service';
import { ToastService } from '../../../core/services/toash.service';

@Component({
  selector: 'app-site-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './site-details.html',
  styleUrl: './site-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteDetails implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private siteService = inject(SiteService);
  private checkpointService = inject(CheckpointService);
  private agentService = inject(AgentService);
  private planningService = inject(PlanningService);
  private toastService = inject(ToastService);

  private subscriptions = new Subscription();

  // Signaux pour les données
  loading = signal(false);
  loadingCheckpoints = signal(false);
  loadingAgents = signal(false);
  loadingPlannings = signal(false);
  savingOrder = signal(false);

  // Signaux pour le formulaire checkpoint
  editingCheckpoint = signal<Checkpoint | null>(null);
  isSubmittingCheckpoint = signal(false);

  // Formulaire checkpoint
  checkpointForm!: FormGroup;

  // Onglet actif
  activeTab = signal<'checkpoints' | 'agents' | 'plannings'>('checkpoints');

  // Données
  site = signal<Site | null>(null);
  checkpoints = signal<Checkpoint[]>([]);
  agents = signal<Agent[]>([]);
  plannings = signal<Planning[]>([]);

  // Computed signals
  activeCheckpointsCount = computed(() => {
    return this.checkpoints().filter((cp) => cp.isActive).length;
  });

  inactiveCheckpointsCount = computed(() => {
    return this.checkpoints().filter((cp) => !cp.isActive).length;
  });

  checkpointsWithCoordsCount = computed(() => {
    return this.checkpoints().filter((cp) => cp.latitude && cp.longitude).length;
  });

  activeAgentsCount = computed(() => {
    return this.agents().filter((agent) => agent.status === 'working').length;
  });

  idleAgentsCount = computed(() => {
    return this.agents().filter((agent) => agent.status === 'idle').length;
  });

  planningsByStatus = computed(() => {
    const plannings = this.plannings();
    return {
      pending: plannings.filter((p) => p.status === 'pending').length,
      active: plannings.filter((p) => p.status === 'active').length,
      completed: plannings.filter((p) => p.status === 'completed').length,
      missed: plannings.filter((p) => p.status === 'missed').length,
      cancelled: plannings.filter((p) => p.status === 'cancelled').length,
    };
  });

  upcomingPlannings = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.plannings()
      .filter((p) => p.workDate >= today && p.status === 'pending')
      .sort((a, b) => a.workDate.localeCompare(b.workDate))
      .slice(0, 5);
  });

  ngOnInit() {
    this.initCheckpointForm();
    const siteId = this.route.snapshot.paramMap.get('id');
    if (siteId) {
      this.loadSite(siteId);
    } else {
      this.toastService.error('ID du site non trouvé');
      this.router.navigate(['/sites']);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    // Nettoyage
    this.checkpoints.set([]);
    this.agents.set([]);
    this.plannings.set([]);
  }

  initCheckpointForm() {
    this.checkpointForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      order: [0, [Validators.required, Validators.min(0)]],
      latitude: [null, [Validators.required]],
      longitude: [null, [Validators.required]],
      radius: [50, [Validators.required, Validators.min(10), Validators.max(500)]],
    });
  }

  async loadSite(siteId: string) {
    this.loading.set(true);

    try {
      const response = await lastValueFrom(this.siteService.getOne(siteId));
      if (response?.success && response.data) {
        this.site.set(response.data);
        // Charger les données liées
        this.loadCheckpoints();
        this.loadAgents();
        this.loadPlannings();
      } else {
        this.toastService.error('Site non trouvé');
        this.router.navigate(['/sites']);
      }
    } catch (err) {
      console.error('Erreur chargement site:', err);
      this.toastService.error('Impossible de charger les détails du site');
      this.router.navigate(['/sites']);
    } finally {
      this.loading.set(false);
    }
  }

  loadCheckpoints() {
    const siteId = this.site()?.id;
    if (!siteId) return;

    this.loadingCheckpoints.set(true);

    this.checkpointService.getBySite(siteId).subscribe({
      next: (response) => {
        const checkpoints = response?.data || response || [];
        const checkpointsArray = Array.isArray(checkpoints) ? checkpoints : [];
        const sorted = [...checkpointsArray].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        this.checkpoints.set(sorted);
        this.loadingCheckpoints.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement checkpoints:', err);
        this.toastService.error('Impossible de charger les points de contrôle');
        this.loadingCheckpoints.set(false);
      },
    });
  }

  saveCheckpoint() {
    if (this.checkpointForm.invalid || this.isSubmittingCheckpoint()) return;

    const siteId = this.site()?.id;
    if (!siteId) {
      this.toastService.error('Site non trouvé');
      return;
    }

    this.isSubmittingCheckpoint.set(true);
    const formValue = this.checkpointForm.value;
    const currentEdit = this.editingCheckpoint();

    const data: Partial<Checkpoint> = {
      siteId: siteId,
      name: formValue.name,
      order: formValue.order || 0,
      latitude: parseFloat(Number(formValue.latitude).toFixed(8)),
      longitude: parseFloat(Number(formValue.longitude).toFixed(8)),
      radius: formValue.radius || 50,
      isActive: currentEdit?.isActive ?? true,
    };

    const request$ = currentEdit?.id
      ? this.checkpointService.update(currentEdit.id, data)
      : this.checkpointService.create(data);

    const sub = request$.subscribe({
      next: () => {
        this.toastService.success(
          currentEdit ? 'Point modifié avec succès' : 'Point ajouté avec succès',
        );
        this.loadCheckpoints();
        this.cancelEditCheckpoint();
        this.isSubmittingCheckpoint.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la sauvegarde:', err);
        this.toastService.error(err.error?.message || 'Erreur lors de la sauvegarde');
        this.isSubmittingCheckpoint.set(false);
      },
    });
    this.subscriptions.add(sub);
  }

  editCheckpoint(checkpoint: Checkpoint) {
    this.editingCheckpoint.set(checkpoint);
    this.checkpointForm.patchValue({
      name: checkpoint.name,
      order: checkpoint.order || 0,
      latitude: checkpoint.latitude,
      longitude: checkpoint.longitude,
      radius: checkpoint.radius || 50,
    });
  }

  cancelEditCheckpoint() {
    this.editingCheckpoint.set(null);
    this.checkpointForm.reset({
      order: 0,
      radius: 50,
    });
  }

  loadAgents() {
    const companyId = this.site()?.companyId;
    if (!companyId) return;

    this.loadingAgents.set(true);

    this.agentService.getAll().subscribe({
      next: (response) => {
        const agents = response?.data || response || [];
        const agentsArray = Array.isArray(agents) ? agents : [];
        this.agents.set(agentsArray);
        this.loadingAgents.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement agents:', err);
        this.toastService.error('Impossible de charger les agents');
        this.loadingAgents.set(false);
      },
    });
  }

  loadPlannings() {
    const siteId = this.site()?.id;
    if (!siteId) return;

    this.loadingPlannings.set(true);

    this.planningService.getAll({ siteId: siteId }).subscribe({
      next: (response) => {
        const plannings = response?.data || [];
        this.plannings.set(plannings);
        this.loadingPlannings.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement plannings:', err);
        this.toastService.error('Impossible de charger les plannings');
        this.loadingPlannings.set(false);
      },
    });
  }

  async saveOrder(checkpoints: Checkpoint[]) {
    this.savingOrder.set(true);

    try {
      const updatePromises = checkpoints.map((cp, index) => {
        const newOrder = index + 1;
        if (cp.id && cp.order !== newOrder) {
          return lastValueFrom(this.checkpointService.update(cp.id, { order: newOrder }));
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      this.toastService.success('Ordre des points sauvegardé avec succès');
      await this.loadCheckpoints();
    } catch (err) {
      console.error('Erreur sauvegarde ordre:', err);
      this.toastService.error("Erreur lors de la sauvegarde de l'ordre");
    } finally {
      this.savingOrder.set(false);
    }
  }

  dropCheckpoint(event: CdkDragDrop<Checkpoint[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const currentCheckpoints = [...this.checkpoints()];
    moveItemInArray(currentCheckpoints, event.previousIndex, event.currentIndex);

    const updatedCheckpoints = currentCheckpoints.map((cp, index) => ({
      ...cp,
      order: index + 1,
    }));

    this.checkpoints.set(updatedCheckpoints);
    this.saveOrder(updatedCheckpoints);
  }

  toggleCheckpointStatus(checkpoint: Checkpoint) {
    if (!checkpoint.id) return;

    this.checkpointService.toggleStatus(checkpoint.id).subscribe({
      next: () => {
        this.toastService.success(`Statut du point "${checkpoint.name}" modifié`);
        this.loadCheckpoints();
      },
      error: (err) => {
        console.error('Erreur modification statut:', err);
        this.toastService.error('Impossible de modifier le statut');
      },
    });
  }

  refreshData() {
    const siteId = this.site()?.id;
    if (siteId) {
      this.loadSite(siteId);
    }
  }

  goBack() {
    this.router.navigate(['/sites']);
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  getAgentStatusClass(status: string): string {
    const classes: Record<string, string> = {
      working: 'bg-emerald-100 text-emerald-700',
      idle: 'bg-amber-100 text-amber-700',
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }

  getAgentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      working: 'En service',
      idle: 'Disponible',
    };
    return labels[status] || status;
  }

  getPlanningStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      missed: 'bg-rose-100 text-rose-700',
      cancelled: 'bg-slate-100 text-slate-700',
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }

  getPlanningStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      active: 'Actif',
      completed: 'Terminé',
      missed: 'Manqué',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  }

  formatCoordinate(value: number): string {
    if (!value && value !== 0) return '—';
    return value.toFixed(6);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatDateTime(date?: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('fr-FR');
  }

  getCheckpointIcon(order: number): string {
    const icons: Record<number, string> = {
      1: 'fa-flag-checkered',
      2: 'fa-location-dot',
      3: 'fa-building',
      4: 'fa-door-open',
      5: 'fa-camera',
      6: 'fa-shield-alt',
      7: 'fa-clipboard-list',
      8: 'fa-key',
      9: 'fa-phone-alt',
      10: 'fa-tools',
    };
    return icons[order] || 'fa-map-pin';
  }

  getContractTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CDD: 'CDD',
      CDI: 'CDI',
      STAGIAIRE: 'Stagiaire',
      VACATAIRE: 'Vacataire',
    };
    return labels[type] || type;
  }
}
