import { Component, signal, inject, OnInit, computed } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../../core/services/company.service';
import { LogoComponent } from '../../../shared/components/logo/logo';

import { CountryService } from '../../../core/services/country.service';
import { Country } from '../../../core/models/Country.model';
import { ToastService } from '../../../core/services/toash.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LogoComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private countryService = inject(CountryService);

  countries = signal<Country[]>([]);
  // État du dropdown
  isCountryDropdownOpen = signal(false);
  searchTerm = signal('');
  selectedCountry = signal<Country | null>(null);

  // Liste filtrée dynamiquement selon la recherche
  filteredCountries = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.countries().filter((c) => c.name.toLowerCase().includes(term));
  });

  toggleDropdown() {
    this.isCountryDropdownOpen.update((v) => !v);
    if (this.isCountryDropdownOpen()) this.searchTerm.set(''); // Reset recherche à l'ouverture
  }

  selectCountry(country: Country) {
    this.selectedCountry.set(country);
    this.companyForm.patchValue({ country: country.name });
    this.isCountryDropdownOpen.set(false);
  }
  // Fichiers uploadés
  selectedLogo = signal<File | null>(null);
  selectedPhotoProfile = signal<File | null>(null);
  selectedRccm = signal<File | null>(null);
  selectedNif = signal<File | null>(null);

  // Previews
  logoPreview = signal<string | null>(null);
  photoProfilePreview = signal<string | null>(null);
  rccmPreview = signal<boolean>(false);
  nifPreview = signal<boolean>(false);

  // États
  mode = signal<
    'login' | 'forgot' | 'verify-code' | 'reset-password' | 'register' | 'changePassword'
  >('login');
  step = signal<1 | 2 | 3>(1);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Formulaires
  loginForm!: FormGroup;
  forgotForm!: FormGroup;
  changePasswordForm!: FormGroup;
  companyForm!: FormGroup;

  // Pour la réinitialisation de mot de passe
  resetEmail = signal<string>('');
  resetCode = signal<string>('');
  resendCooldown = signal<number>(0);
  private resendInterval: any;

  // Formulaires supplémentaires
  verifyCodeForm!: FormGroup;
  resetPasswordForm!: FormGroup;

  ngOnInit() {
    this.loadCountries();
    this.initForms();

    this.route.queryParams.subscribe((params) => {
      // Cas Inscription
      if (params['action'] === 'register') {
        this.mode.set('register');
        this.step.set(1);
      }

      // Cas Première Connexion (Force Change Password)
      if (params['mode'] === 'changePassword') {
        this.mode.set('changePassword');

        // CRUCIAL : On récupère l'email passé dans l'URL pour dégriser le bouton
        const emailFromUrl = params['email'];
        if (emailFromUrl) {
          this.changePasswordForm.patchValue({ email: emailFromUrl });
        } else {
          console.warn("L'email est manquant dans les paramètres de l'URL.");
        }
      }
      

        this.route.queryParams.subscribe((params) => {
          console.log('PARAMS:', params);
        });
    });
  }

  loadCountries() {
    this.countryService.getCountries().subscribe((data) => {
      this.countries.set(data);
    });
  }

  private initForms() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    // 1. Initialisation du formulaire dans initForms()
    this.changePasswordForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        // On peut garder currentPassword optionnel pour la première connexion
        currentPassword: [''],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      },
      {
        // On réutilise ton validateur de correspondance existant
        validators: this.passwordMatchValidator,
      },
    );

    this.verifyCodeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });

    this.resetPasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.companyForm = this.fb.group({
      // Informations entreprise (Step 1)
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      city: [''],
      country: [''],
      state: [''],

      // Informations admin (Step 3)
      adminFullname: ['', [Validators.required, Validators.minLength(3)]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPhone: [''],
    });
  }

  // Validateur personnalisé
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  nextStep() {
    this.errorMessage.set(null);

    if (this.step() === 1) {
      const nameControl = this.companyForm.get('name');
      if (nameControl?.valid) {
        this.step.set(2);
      } else {
        nameControl?.markAsTouched();
        this.errorMessage.set("Veuillez saisir le nom de l'entreprise.");
      }
    } else if (this.step() === 2) {
      if (this.selectedRccm() && this.selectedNif()) {
        this.step.set(3);
      } else {
        this.errorMessage.set('Veuillez télécharger les documents RCCM et NIF.');
      }
    }
  }

  prevStep() {
    if (this.step() > 1) {
      this.step.set((this.step() - 1) as 1 | 2 | 3);
      this.errorMessage.set(null);
    }
  }

  onAction() {
    if (this.mode() === 'login') {
      this.handleLogin();
    } else if (this.mode() === 'forgot') {
      this.handleForgotPassword();
    } else if (this.mode() === 'changePassword') {
      this.handleChangePassword();
    } else if (this.mode() === 'register' && this.step() === 3) {
      this.handleCompanyRegister();
    }
  }

  // 3. La méthode d'action corrigée
  handleChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { email, newPassword } = this.changePasswordForm.value;
    this.loading.set(true);

    // Payload strict pour forceChangePassword
    const payload = {
      email: email.trim().toLowerCase(),
      newPassword: newPassword,
    };

    this.authService.forceChangePassword(payload).subscribe({
      next: () => {
        this.toastService.success('Mot de passe défini ! Vous pouvez vous connecter.');
        this.mode.set('login');
        this.loading.set(false);
        this.changePasswordForm.reset();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur lors de la mise à jour');
        this.loading.set(false);
      },
    });
  }

  // Gestionnaire du formulaire "Mot de passe oublié" (étape 1)
  handleForgotPassword() {
    if (this.forgotForm.invalid) {
      this.errorMessage.set('Email requis');
      return;
    }

    this.loading.set(true);
    const email = this.forgotForm.get('email')?.value.trim().toLowerCase();

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetEmail.set(email);
        this.mode.set('verify-code');
        this.toastService.success(
          'Un code de vérification a été envoyé à votre adresse email.',
        );
        this.startResendCooldown();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || "Erreur lors de l'envoi du code.");
      },
    });
  }

  // Gestionnaire de vérification du code (étape 2)
  handleVerifyCode() {
    if (this.verifyCodeForm.invalid) {
      this.errorMessage.set('Code invalide (6 chiffres requis)');
      return;
    }

    this.loading.set(true);
    const code = this.verifyCodeForm.get('code')?.value;

    this.authService
      .verifyResetCode({
        email: this.resetEmail(),
        code: code,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.resetCode.set(code);
          this.mode.set('reset-password');
          this.toastService.success(
            'Code vérifié avec succès. Vous pouvez maintenant créer un nouveau mot de passe.',
          );
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Code invalide ou expiré. Veuillez réessayer.',
          );
        },
      });
  }

  // Gestionnaire de réinitialisation du mot de passe (étape 3)
  handleResetPassword() {
    if (this.resetPasswordForm.invalid) {
      if (this.resetPasswordForm.hasError('mismatch')) {
        this.errorMessage.set('Les mots de passe ne correspondent pas');
      } else {
        this.errorMessage.set('Mot de passe requis (minimum 6 caractères)');
      }
      return;
    }

    this.loading.set(true);
    const newPassword = this.resetPasswordForm.get('newPassword')?.value;

    this.authService
      .resetPassword({
        email: this.resetEmail(),
        code: this.resetCode(),
        newPassword: newPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.toastService.success(
            'Mot de passe réinitialisé avec succès. Connectez-vous avec votre nouveau mot de passe.',
          );
          this.mode.set('login');
          this.resetForms();
          this.stopResendCooldown();
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Erreur lors de la réinitialisation du mot de passe.',
          );
        },
      });
  }

  // Renvoyer le code
  resendResetCode() {
    if (this.resendCooldown() > 0) return;

    this.loading.set(true);
    this.authService.forgotPassword(this.resetEmail()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Un nouveau code a été envoyé à votre adresse email.');
        this.startResendCooldown();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors du renvoi du code.');
      },
    });
  }

  // Compte à rebours pour renvoi du code
  private startResendCooldown() {
    this.resendCooldown.set(60);
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.resendInterval = setInterval(() => {
      if (this.resendCooldown() <= 1) {
        clearInterval(this.resendInterval);
        this.resendCooldown.set(0);
      } else {
        this.resendCooldown.update((v) => v - 1);
      }
    }, 1000);
  }

  private stopResendCooldown() {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
    this.resendCooldown.set(0);
  }

  private handleLogin() {
    if (this.loginForm.invalid) {
      this.errorMessage.set('Email et mot de passe requis');
      return;
    }

    this.loading.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        const user = res.data.user;

        if (user) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/profil']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Identifiants incorrects.');
      },
    });
  }

  private handleCompanyRegister() {
    if (this.companyForm.invalid) {
      if (this.companyForm.hasError('passwordMismatch')) {
        this.errorMessage.set('Les mots de passe ne correspondent pas.');
      } else {
        this.errorMessage.set('Veuillez remplir tous les champs obligatoires correctement.');
      }
      return;
    }

    this.loading.set(true);

    const formData = new FormData();
    const values = this.companyForm.value;

    // Champs de l'entreprise
    const companyFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'country'];
    companyFields.forEach((key) => {
      const value = values[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    // Champs de l'admin
    const adminFields = ['adminFullname', 'adminEmail', 'adminPhone'];
    adminFields.forEach((key) => {
      const value = values[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    formData.append('isAdminCreation', 'false');

    // Fichiers
    if (this.selectedLogo()) formData.append('logo', this.selectedLogo()!);
    if (this.selectedPhotoProfile()) formData.append('photoProfile', this.selectedPhotoProfile()!);
    if (this.selectedRccm()) formData.append('rccmDoc', this.selectedRccm()!);
    if (this.selectedNif()) formData.append('nifDoc', this.selectedNif()!);

    this.companyService.createCompany(formData as any).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success(
          "Demande d'inscription envoyée avec succès. Vous serez notifié par email après validation.",
        );
        this.resetForms();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || "Erreur lors de l'inscription.");
      },
    });
  }

  handleBack() {
    if (this.mode() === 'register') {
      if (this.step() === 1) {
        this.mode.set('login');
        this.resetForms();
      } else {
        this.step.set(1);
      }
    } else if (this.mode() === 'forgot') {
      this.mode.set('login');
      this.resetForms();
    } else if (this.mode() === 'verify-code') {
      this.mode.set('forgot');
      this.verifyCodeForm.reset();
      this.errorMessage.set(null);
    } else if (this.mode() === 'reset-password') {
      this.mode.set('verify-code');
      this.resetPasswordForm.reset();
      this.errorMessage.set(null);
    } else {
      this.mode.set('login');
      this.resetForms();
    }
  }

  resetForms() {
    this.mode.set('login');
    this.step.set(1);
    this.companyForm.reset();
    this.loginForm.reset();
    this.forgotForm.reset();
    this.changePasswordForm?.reset();
    this.verifyCodeForm?.reset();
    this.resetPasswordForm?.reset();
    this.errorMessage.set(null);
    this.resetEmail.set('');
    this.resetCode.set('');
    this.stopResendCooldown();

    // Reset des fichiers et previews
    this.selectedLogo.set(null);
    this.selectedPhotoProfile.set(null);
    this.selectedRccm.set(null);
    this.selectedNif.set(null);
    this.logoPreview.set(null);
    this.photoProfilePreview.set(null);
    this.rccmPreview.set(false);
    this.nifPreview.set(false);
  }

  onFileSelected(event: any, type: 'logo' | 'photoProfile' | 'rccm' | 'nif') {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Le fichier ne doit pas dépasser 5 Mo');
      return;
    }

    switch (type) {
      case 'logo':
        this.selectedLogo.set(file);
        const logoReader = new FileReader();
        logoReader.onload = (e) => this.logoPreview.set(e.target?.result as string);
        logoReader.readAsDataURL(file);
        break;
      case 'photoProfile':
        this.selectedPhotoProfile.set(file);
        const photoReader = new FileReader();
        photoReader.onload = (e) => this.photoProfilePreview.set(e.target?.result as string);
        photoReader.readAsDataURL(file);
        break;
      case 'rccm':
        this.selectedRccm.set(file);
        this.rccmPreview.set(true);
        break;
      case 'nif':
        this.selectedNif.set(file);
        this.nifPreview.set(true);
        break;
    }
  }

  removeFile(type: 'logo' | 'photoProfile' | 'rccm' | 'nif', inputElement?: HTMLInputElement) {
    switch (type) {
      case 'logo':
        this.selectedLogo.set(null);
        this.logoPreview.set(null);
        break;
      case 'photoProfile':
        this.selectedPhotoProfile.set(null);
        this.photoProfilePreview.set(null);
        break;
      case 'rccm':
        this.selectedRccm.set(null);
        this.rccmPreview.set(false);
        break;
      case 'nif':
        this.selectedNif.set(null);
        this.nifPreview.set(false);
        break;
    }

    if (inputElement) {
      inputElement.value = '';
    }
  }
}
