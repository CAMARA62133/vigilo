// agents.component.ts - Ajout du signal viewMode
import { Component, signal, computed, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';

import { UtilsService } from '../../../core/services/table-utils.service';
import { AgentService } from '../../../core/services/agent.service';
import { MediaService } from '../../../core/services/media.service';
import { Agent } from '../../../core/models/Agent.model';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toash.service';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './agents.html',
  styleUrls: ['./agents.scss'],
})
export class Agents implements OnInit {
  // Services
  private utilsService = inject(UtilsService);
  private agentService = inject(AgentService);
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  // --- MODE D'AFFICHAGE ---
  viewMode = signal<'card' | 'list'>('card'); // 'card' ou 'list'

  // --- ÉTAT DU MODAL (Création/Modification) ---
  isModalOpen = signal(false);
  selectedAgent = signal<Agent | null>(null);
  isDetailsModalOpen = signal(false);
  selectedAgentForDetails = signal<Agent | null>(null);

  // Formulaire réactif
  agentForm!: FormGroup;

  // Fichiers uploadés
  photoFile: File | null = null;
  photoPreview: string | null = null;
  identityDocumentFile: File | null = null;

  // Signaux de données
  private agentsData = signal<Agent[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  // Onglets
  currentTab = signal<'all' | 'CDI' | 'CDD' | 'VACATAIRE' | 'STAGIAIRE'>('all');

  // Recherche et pagination
  searchQuery = signal<string>('');
  currentPage = signal(1);
  itemsPerPage = 8;

  // Tri
  sortColumn = signal<string>('fullname');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Types de contrat disponibles
  contractTypes = [
    { value: 'CDI', label: 'CDI' },
    { value: 'CDD', label: 'CDD' },
    { value: 'VACATAIRE', label: 'Vacataire' },
    { value: 'STAGIAIRE', label: 'Stagiaire' },
  ];

  // Types de pièce d'identité
  identityTypes = [
    { value: 'CNI', label: 'CNI' },
    { value: 'Passeport', label: 'Passeport' },
    { value: 'Carte Électeur', label: 'Carte Électeur' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadAgents();
  }

  // --- GESTION DU MODE D'AFFICHAGE ---
  setViewMode(mode: 'card' | 'list') {
    this.viewMode.set(mode);
  }

  initForm() {
    this.agentForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      hireDate: ['', Validators.required],
      contractType: ['CDI', Validators.required],
      emergencyContact: this.fb.group({
        name: [''],
        phone: [''],
        relationship: [''],
      }),
      identityCard: this.fb.group({
        type: ['CNI'],
        number: [''],
        expiryDate: [''],
      }),
    });
  }

  // --- NOMBRES D'AGENTS ---
  idleAgentsCount = computed(() => this.agentsData().filter((a) => a.status === 'idle').length);
  workingAgentsCount = computed(
    () => this.agentsData().filter((a) => a.status === 'working').length,
  );
  totalAgentsCount = computed(() => this.agentsData().length);
  cdiAgentsCount = computed(() => this.agentsData().filter((a) => a.contractType === 'CDI').length);

  loadAgents() {
    this.isLoading.set(true);

    this.agentService.getAll().subscribe({
      next: (response: any) => {
        const agents = response?.data || response?.agents || response || [];
        this.agentsData.set(agents);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Erreur lors du chargement des agents');
        this.isLoading.set(false);
      },
    });
  }

  // --- GESTION DU MODAL ---
  openModal(agent: Agent | null = null) {
    if (agent) {
      this.openEditModal(agent);
    } else {
      this.openCreateModal();
    }
  }

  openCreateModal() {
    this.selectedAgent.set(null);
    this.resetForm();
    this.resetFiles();
    this.isModalOpen.set(true);
  }

  openEditModal(agent: Agent) {
    this.selectedAgent.set(agent);

    this.agentForm.patchValue({
      fullname: agent.user?.fullname || '',
      email: agent.user?.email || '',
      phone: agent.user?.phone || '',
      hireDate: agent.hireDate ? new Date(agent.hireDate).toISOString().split('T')[0] : '',
      contractType: agent.contractType || 'CDI',
      emergencyContact: {
        name: agent.emergencyContact?.name || '',
        phone: agent.emergencyContact?.phone || '',
        relationship: agent.emergencyContact?.relationship || '',
      },
      identityCard: {
        type: agent.identityCard?.type || 'CNI',
        number: agent.identityCard?.number || '',
        expiryDate: agent.identityCard?.expiryDate
          ? new Date(agent.identityCard.expiryDate).toISOString().split('T')[0]
          : '',
      },
    });

    if (agent.user?.photoProfile) {
      this.photoPreview = this.getPhotoUrl(agent.user.photoProfile);
    }

    this.resetFiles();
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedAgent.set(null);
    this.resetForm();
    this.resetFiles();
  }

  // --- GESTION DES FICHIERS ---
  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.photoFile);
    }
  }

  onIdentityDocumentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.identityDocumentFile = input.files[0];
    }
  }

  removePhoto() {
    this.photoFile = null;
    this.photoPreview = null;
    const fileInput = document.getElementById('photoInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  removeIdentityDocument() {
    this.identityDocumentFile = null;
    const fileInput = document.getElementById('identityDocumentInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // --- CRUD ACTIONS ---
  saveAgent() {
    if (this.agentForm.invalid) {
      this.toastService.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const formValue = this.agentForm.value;
    const formData = new FormData();

    formData.append('fullname', formValue.fullname);
    formData.append('email', formValue.email);
    formData.append('phone', formValue.phone);
    if (formValue.hireDate) formData.append('hireDate', formValue.hireDate);
    if (formValue.contractType) formData.append('contractType', formValue.contractType);
    if (formValue.emergencyContact) {
      formData.append('emergencyContact', JSON.stringify(formValue.emergencyContact));
    }
    if (formValue.identityCard) {
      formData.append('identityCard', JSON.stringify(formValue.identityCard));
    }
    if (this.photoFile) formData.append('photoProfile', this.photoFile);
    if (this.identityDocumentFile) formData.append('identityDocument', this.identityDocumentFile);

    this.isSaving.set(true);

    if (this.selectedAgent()) {
      this.agentService.updateAgent(this.selectedAgent()!.id, formData).subscribe({
        next: () => {
          this.toastService.success('Agent modifié avec succès');
          this.loadAgents();
          this.closeModal();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erreur lors de la modification');
          this.isSaving.set(false);
        },
      });
    } else {
      this.agentService.createAgent(formData).subscribe({
        next: () => {
          this.toastService.success('Agent créé avec succès');
          this.loadAgents();
          this.closeModal();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erreur lors de la création');
          this.isSaving.set(false);
        },
      });
    }
  }

  // --- FILTRAGE ---
  filteredByTab = computed(() => {
    const tab = this.currentTab();
    const all = this.agentsData();

    if (tab === 'CDI') return all.filter((a) => a.contractType === 'CDI');
    if (tab === 'CDD') return all.filter((a) => a.contractType === 'CDD');
    if (tab === 'VACATAIRE') return all.filter((a) => a.contractType === 'VACATAIRE');
    if (tab === 'STAGIAIRE') return all.filter((a) => a.contractType === 'STAGIAIRE');
    return all;
  });

  searchedAgents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const data = this.filteredByTab();
    if (!query) return data;
    return data.filter(
      (agent) =>
        agent.user?.fullname?.toLowerCase().includes(query) ||
        agent.user?.email?.toLowerCase().includes(query) ||
        agent.user?.phone?.toLowerCase().includes(query) ||
        agent.matricule?.toLowerCase().includes(query),
    );
  });

  // --- TRI ---
  sortedAgents = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const data = this.searchedAgents();

    const sorted = [...data];
    return sorted.sort((a, b) => {
      let aVal: any, bVal: any;

      if (column === 'fullname') {
        aVal = a.user?.fullname || '';
        bVal = b.user?.fullname || '';
      } else if (column === 'matricule') {
        aVal = a.matricule || '';
        bVal = b.matricule || '';
      } else if (column === 'hireDate') {
        aVal = new Date(a.hireDate || 0).getTime();
        bVal = new Date(b.hireDate || 0).getTime();
      } else {
        aVal = a[column as keyof Agent] || '';
        bVal = b[column as keyof Agent] || '';
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  // --- PAGINATION ---
  paginatedAgents = computed(() => {
    return this.utilsService.paginate(this.sortedAgents(), this.currentPage(), this.itemsPerPage);
  });

  // --- NAVIGATION ET UI ---
  onSearch() {
    this.currentPage.set(1);
  }

  sortBy(column: string) {
    const newDir = this.utilsService.handleSort(column, this.sortColumn(), this.sortDirection());
    this.sortColumn.set(column);
    this.sortDirection.set(newDir as 'asc' | 'desc');
  }

  setTab(tab: 'all' | 'CDI' | 'CDD' | 'VACATAIRE' | 'STAGIAIRE') {
    this.currentTab.set(tab);
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  // Helpers Pagination
  totalPages = computed(() =>
    this.utilsService.getTotalPages(this.sortedAgents().length, this.itemsPerPage),
  );
  startIndex = computed(() =>
    this.utilsService.getStartIndex(
      this.currentPage(),
      this.itemsPerPage,
      this.sortedAgents().length,
    ),
  );
  endIndex = computed(() =>
    this.utilsService.getEndIndex(
      this.currentPage(),
      this.itemsPerPage,
      this.sortedAgents().length,
    ),
  );

  nextPage() {
    this.currentPage.update((p) => Math.min(p + 1, this.totalPages()));
  }
  previousPage() {
    this.currentPage.update((p) => Math.max(p - 1, 1));
  }
  goToPage(page: number | string) {
    if (typeof page === 'number') this.currentPage.set(page);
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;

    if (total <= 1) return [1];

    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }

  // --- FORMULAIRES ---
  resetForm() {
    this.agentForm.reset({
      fullname: '',
      email: '',
      phone: '',
      hireDate: '',
      contractType: 'CDI',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      identityCard: {
        type: 'CNI',
        number: '',
        expiryDate: '',
      },
    });
  }

  resetFiles() {
    this.photoFile = null;
    this.photoPreview = null;
    this.identityDocumentFile = null;
  }

  viewAgentDetails(agent: Agent) {
    this.selectedAgentForDetails.set(agent);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal() {
    this.isDetailsModalOpen.set(false);
    this.selectedAgentForDetails.set(null);
  }

  // --- TOGGLE ACTIVE ---
  toggleActive(agent: Agent): void {
    this.authService.toggleUserActive(agent.userId).subscribe({
      next: (res) => {
        if (agent.user) {
          agent.user.status = res.data.status;
        }
        this.toastService.success(
          `Le compte a été ${res.data.status === 'active' ? 'activé' : 'désactivé'} avec succès.`,
        );
      },
      error: (err) => {
        console.error(err);
        this.toastService.error('Une erreur est survenue lors de la mise à jour du statut.');
      },
    });
  }

  // --- STYLES ---
  getContratStyles(contrat: string | undefined): string {
    const styles: Record<string, string> = {
      CDI: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      CDD: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
      VACATAIRE:
        'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
      STAGIAIRE:
        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    };
    return (
      styles[contrat || ''] ||
      'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
    );
  }

  getContratLabel(contrat: string | undefined): string {
    const labels: Record<string, string> = {
      CDI: 'CDI',
      CDD: 'CDD',
      VACATAIRE: 'Vacataire',
      STAGIAIRE: 'Stagiaire',
    };
    return labels[contrat || ''] || 'Non spécifié';
  }

  getStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      idle: 'Disponible',
      working: 'En mission',
    };
    return labels[status || ''] || 'Non défini';
  }

  getStatusStyles(status: string | undefined): string {
    const styles: Record<string, string> = {
      idle: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      working:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    };
    return (
      styles[status || ''] ||
      'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
    );
  }

  getPhotoUrl(fileName: string | null | undefined): string {
    if (!fileName) return '';
    return this.mediaService.getMediaUrl(fileName, 'photos');
  }

  getDocumentUrl(fileName: string | null | undefined): string {
    if (!fileName) return '';
    return this.mediaService.getMediaUrl(fileName, 'documents');
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Non renseignée';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getIdentityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CNI: 'CNI',
      Passeport: 'Passeport',
      'Carte Électeur': 'Carte Électeur',
    };
    return labels[type] || type;
  }

  getAgentInitials(name: string | undefined | null): string {
    return (name || '').slice(0, 2).toUpperCase();
  }

  isExpired(expiryDate: string | null | undefined): boolean {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  }
}
