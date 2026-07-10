import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { MediaService } from '../../../core/services/media.service';
import { ToastService } from '../../../core/services/toash.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profil.html',
})
export class Profil implements OnInit {
  // ================= SERVICES =================
  private authService = inject(AuthService);
  private mediaService = inject(MediaService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  // ================= STATE =================
  user = this.authService.user;
  isLoading = this.authService.isLoading;
  isChangingPassword = signal(false);
  isUpdatingProfile = signal(false);
  activeTab = signal<'info' | 'password' | 'edit'>('info');

  // ================= FORMULAIRES =================
  passwordForm!: FormGroup;
  profileForm!: FormGroup;

  // ================= FICHIERS =================
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;

  // ================= INIT =================
  ngOnInit() {
    this.initForms();
    this.authService.checkAuth();
  }

  // ================= FORMULAIRES =================
  initForms() {
    // Formulaire changement de mot de passe
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );

    // Formulaire modification profil
    this.profileForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      username: [''],
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  // ================= MÉTHODES FORMULAIRE =================
  loadProfileData() {
    const currentUser = this.user();
    if (currentUser) {
      this.profileForm.patchValue({
        fullname: currentUser.fullname || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
      });
    }
  }

  // ================= GESTION FICHIERS =================
  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedPhoto = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedPhoto);
    }
  }

  removePhoto() {
    this.selectedPhoto = null;
    this.photoPreview = null;
    const fileInput = document.getElementById('photoInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // ================= ACTIONS =================
  changePassword() {
    if (this.passwordForm.invalid) return;

    this.isChangingPassword.set(true);
    this.authService
      .changePassword({
        currentPassword: this.passwordForm.get('currentPassword')?.value,
        newPassword: this.passwordForm.get('newPassword')?.value,
       
      })
      .subscribe({
        next: () => {
          this.toastService.success('Mot de passe modifié avec succès');
          this.passwordForm.reset();
          this.activeTab.set('info');
          this.isChangingPassword.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erreur lors du changement');
          this.isChangingPassword.set(false);
        },
      });
  }

  updateProfile() {
    if (this.profileForm.invalid) return;

    this.isUpdatingProfile.set(true);
    const formData = new FormData();
    const values = this.profileForm.value;

    if (values.fullname) formData.append('fullname', values.fullname);
    if (values.email) formData.append('email', values.email);
    if (values.phone) formData.append('phone', values.phone);
    if (values.username) formData.append('username', values.username);
    if (this.selectedPhoto) formData.append('photoProfile', this.selectedPhoto);

    this.authService.updateProfile(formData).subscribe({
      next: (updatedUser) => {
        this.toastService.success('Profil mis à jour avec succès');
        this.authService.user.set(updatedUser);
        this.activeTab.set('info');
        this.isUpdatingProfile.set(false);
        this.resetProfileForm();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Erreur lors de la mise à jour');
        this.isUpdatingProfile.set(false);
      },
    });
  }

  resetProfileForm() {
    this.profileForm.reset();
    this.selectedPhoto = null;
    this.photoPreview = null;
    this.loadProfileData();
  }

  logout() {
    this.authService.logout();
  }

  // ================= UTILITAIRES =================
  getMediaUrl(path: string | null | undefined, type: 'photos' | 'logos' = 'photos'): string {
    if (!path) return '';
    return this.mediaService.getMediaUrl(path, type);
  }

  // ================= COMPUTED =================

  // Rôle utilisateur
  userRole = computed(() => {
    return this.user()?.role || 'agent';
  });

  roleLabel = computed(() => {
    const role = this.user()?.role;
    switch (role) {
      case 'super_admin':
        return 'Super Administrateur';
      case 'company_admin':
        return 'Admin Entreprise';
      case 'agent':
        return 'Agent de sécurité';
      default:
        return 'Utilisateur';
    }
  });

  roleIcon = computed(() => {
    const role = this.user()?.role;
    switch (role) {
      case 'super_admin':
        return 'fa-crown';
      case 'company_admin':
        return 'fa-building';
      case 'agent':
        return 'fa-user-shield';
      default:
        return 'fa-user';
    }
  });

  roleBadgeColor = computed(() => {
    const role = this.user()?.role;
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'company_admin':
        return 'bg-blue-100 text-blue-700';
      case 'agent':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  });

  // Statut utilisateur
  userStatus = computed(() => {
    return this.user()?.status || 'inactive';
  });

  statusLabel = computed(() => {
    const status = this.user()?.status;
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      default:
        return 'Inconnu';
    }
  });

  statusColor = computed(() => {
    const status = this.user()?.status;
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  });

  statusIcon = computed(() => {
    const status = this.user()?.status;
    switch (status) {
      case 'active':
        return 'fa-check-circle';
      case 'inactive':
        return 'fa-ban';
      default:
        return 'fa-circle';
    }
  });

  // Informations entreprise
  companyName = computed(() => {
    return this.user()?.company?.name || null;
  });

  hasCompany = computed(() => {
    return !!this.user()?.company;
  });

  // Dates
  createdAt = computed(() => {
    return this.user()?.createdAt;
  });

  updatedAt = computed(() => {
    return this.user()?.updatedAt;
  });

  // Email et téléphone
  userEmail = computed(() => {
    return this.user()?.email;
  });

  userPhone = computed(() => {
    return this.user()?.phone;
  });

  userFullname = computed(() => {
    return this.user()?.fullname;
  });

  address = computed(() => {
    return this.user()?.address;
  });

  userPhoto = computed(() => {
    return this.user()?.photoProfile;
  });
}
