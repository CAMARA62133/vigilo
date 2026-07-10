import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../core/services/user.service';
import { CompanyService } from '../../core/services/company.service';
import { MediaService } from '../../core/services/media.service';
import { User } from '../../core/models/user.model';
import { Company } from '../../core/models/Company.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toash.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private companyService = inject(CompanyService);
  private mediaService = inject(MediaService);
  private destroyRef = inject(DestroyRef);

  // State signals
  private usersData = signal<User[]>([]);
  companies = signal<Company[]>([]);
  isLoading = signal(false);
  isModalOpen = signal(false);
  isEditMode = signal(false);
  selectedUserId = signal<string | null>(null);
  isDetailsModalOpen = signal(false);
  selectedUserForDetails = signal<User | null>(null);

  // Form
  userForm!: FormGroup;
  selectedPhoto = signal<File | null>(null);
  photoPreview = signal<string | null>(null);

  // UI State
  currentTab = signal<'all' | 'active' | 'suspended' | 'inactive'>('all');
  searchQuery = signal('');
  currentPage = signal(1);
  sortColumn = signal<'fullname' | 'role' | 'createdAt'>('fullname');
  sortDirection = signal<'asc' | 'desc'>('asc');
  itemsPerPage = 6;

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
    this.loadCompanies();
  }

  private initForm(): void {
    this.userForm = this.fb.group({
      fullname: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      role: ['agent', [Validators.required]],
      companyId: [null],
      status: ['active'],
      mustChangePassword: [true],
    });

    // Update validators when role changes
    this.userForm
      .get('role')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        const companyControl = this.userForm.get('companyId');
        if (role && role !== 'super_admin') {
          companyControl?.setValidators([Validators.required]);
        } else {
          companyControl?.clearValidators();
        }
        companyControl?.updateValueAndValidity();
      });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService
      .getAllUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.usersData.set(response.users || []);
          this.isLoading.set(false);
        },
        error: () => {
          this.toastService.error('Erreur lors du chargement des utilisateurs');
          this.isLoading.set(false);
        },
      });
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.companyService.getAll().subscribe({
      next: (response: any) => {
        const companiesArray = response.data || [];

        // 🔍 Filtrage : On garde uniquement celles qui sont acceptées ET actives
        const filteredCompanies = companiesArray.filter((c: any) => c.accountStatus === 'accepted');

        this.companies.set(filteredCompanies);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Erreur lors du chargement des entreprises');
        this.isLoading.set(false);
      },
    });
  }
  // Computed users with filters
  filteredByTab = computed(() => {
    const tab = this.currentTab();
    const users = this.usersData();

    switch (tab) {
      case 'active':
        return users.filter((u) => u.status === 'active');
      case 'inactive':
        return users.filter((u) => u.status === 'inactive');
      default:
        return users;
    }
  });

  searchedUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const users = this.filteredByTab();

    if (!query) return users;

    return users.filter(
      (user) =>
        user.fullname.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.toLowerCase().includes(query)) ||
        user.role!.toLowerCase().includes(query) ||
        (user.company?.name && user.company.name.toLowerCase().includes(query)),
    );
  });

  sortedUsers = computed(() => {
    const users = [...this.searchedUsers()];
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return users.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (column) {
        case 'fullname':
          aVal = a.fullname;
          bVal = b.fullname;
          break;
        case 'role':
          aVal = a.role;
          bVal = b.role;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt ?? 0).getTime();
          bVal = new Date(b.createdAt ?? 0).getTime();
          break;
        default:
          aVal = a[column];
          bVal = b[column];
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.sortedUsers().slice(start, end);
  });

  // Statistics
  totalUsers = computed(() => this.usersData().length);
  activeUsersCount = computed(() => this.usersData().filter((u) => u.status === 'active').length);

  inactiveUsersCount = computed(
    () => this.usersData().filter((u) => u.status === 'inactive').length,
  );

  totalPages = computed(() => Math.ceil(this.sortedUsers().length / this.itemsPerPage));
  startIndex = computed(() => {
    if (this.sortedUsers().length === 0) return 0;
    return (this.currentPage() - 1) * this.itemsPerPage + 1;
  });
  endIndex = computed(() => {
    const end = this.currentPage() * this.itemsPerPage;
    return Math.min(end, this.sortedUsers().length);
  });

  // Actions
  setTab(tab: 'all' | 'active' | 'suspended' | 'inactive'): void {
    this.currentTab.set(tab);
    this.currentPage.set(1);
    this.searchQuery.set('');
  }

  sortBy(column: 'fullname' | 'role' | 'createdAt'): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  onSearch(): void {
    this.currentPage.set(1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedUserId.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEditModal(user: User): void {
    this.isEditMode.set(true);
    this.selectedUserId.set(user.id);
    this.userForm.patchValue({
      fullname: user.fullname,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      companyId: user.companyId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    });

    if (user.photoProfile) {
      this.photoPreview.set(this.getMediaUrl(user.photoProfile));
    }

    this.isModalOpen.set(true);
  }

  toggleUserStatus(user: User): void {
    this.authService
      .toggleUserActive(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.toastService.success(response.message);
          this.loadUsers();
        },
        error: () => {
          this.toastService.error('Erreur lors du changement de statut');
        },
      });
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach((key) => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);
    const formData = new FormData();
    const formValue = this.userForm.value;

    // Append all form values
    Object.keys(formValue).forEach((key) => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    // Append photo if selected
    if (this.selectedPhoto()) {
      formData.append('photoProfile', this.selectedPhoto()!);
    }

    const request = this.isEditMode()
      ? this.userService.updateUser(this.selectedUserId()!, formData)
      : this.userService.createUser(formData);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.success(
          this.isEditMode() ? 'Utilisateur modifié avec succès' : 'Utilisateur créé avec succès',
        );
        this.loadUsers();
        this.closeModal();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error saving user:', error);
        this.toastService.error(error.error?.message || 'Erreur lors de la sauvegarde');
        this.isLoading.set(false);
      },
    });
  }

  viewUserDetails(user: User): void {
    this.selectedUserForDetails.set(user);
    this.isDetailsModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedUserId.set(null);
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
    this.resetForm();
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedUserForDetails.set(null);
  }

  private resetForm(): void {
    this.userForm.reset({
      fullname: '',
      email: '',
      phone: '',
      role: 'agent',
      companyId: null,
      status: 'active',
      mustChangePassword: true,
    });
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedPhoto.set(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
  }

  getCompanyName(user: User): string {
    return user.company?.name || '—';
  }

  getMediaUrl(path: string): string {
    return this.mediaService.getMediaUrl(path, 'photos');
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'Non renseignée';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatRole(role: string): string {
    const roles: Record<string, string> = {
      super_admin: 'Super Admin',
      company_admin: 'Admin Entreprise',
      supervisor: 'Superviseur',
      agent: 'Agent',
    };
    return roles[role] || role;
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      super_admin: 'fa-crown',
      company_admin: 'fa-building',
      supervisor: 'fa-user-tie',
      agent: 'fa-user-shield',
    };
    return icons[role] || 'fa-user';
  }

  getRoleStyles(role: string): string {
    const styles: Record<string, string> = {
      super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
      company_admin: 'bg-blue-50 text-blue-700 border-blue-200',
      supervisor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      agent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return styles[role] || 'bg-slate-50 text-slate-700 border-slate-200';
  }

  getStatusStyles(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'suspended':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'inactive':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspended':
        return 'Suspendu';
      case 'inactive':
        return 'Inactif';
      default:
        return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'active':
        return 'fa-check-circle';
      case 'suspended':
        return 'fa-exclamation-triangle';
      case 'inactive':
        return 'fa-ban';
      default:
        return 'fa-circle';
    }
  }

  getModalTitle(): string {
    return this.isEditMode() ? "Modifier l'utilisateur" : 'Créer un utilisateur';
  }

  getModalSubtitle(): string {
    return this.isEditMode()
      ? "Mettez à jour les informations de l'utilisateur"
      : 'Remplissez les informations pour créer un nouvel utilisateur';
  }
}
