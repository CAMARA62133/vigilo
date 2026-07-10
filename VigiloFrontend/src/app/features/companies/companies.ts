import { Component, signal, computed, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { UtilsService } from '../../core/services/table-utils.service';

import { MediaService } from '../../core/services/media.service';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../core/models/Company.model';
import { Country } from '../../core/models/Country.model';
import { CountryService } from '../../core/services/country.service';
import { ToastService } from '../../core/services/toash.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './companies.html',
  styleUrls: ['./companies.scss'],
})
export class Companies implements OnInit {
  // Services
  private utilsService = inject(UtilsService);
  private companyService = inject(CompanyService);
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private countryService = inject(CountryService);
  countries = signal<Country[]>([]);

  // État du dropdown
  isCountryDropdownOpen = signal(false);
  searchTerm = signal('');
  selectedCountry = signal<Country | null>(null);
  // Méthodes pour les statistiques
  getAgentCount(company: Company): number {
    return company.users?.length || 0;
  }

  getSiteCount(): number {
    return 0;
  }
  getCompanyInitials(name: string | undefined | null): string {
    const defaultName = name || 'E';
    return defaultName.slice(0, 2).toUpperCase();
  }

  getPlanName(company: Company): string {
    return company.plan?.name || 'Starter';
  }
  // Liste filtrée dynamiquement selon la recherche
  filteredCountries = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.countries().filter((c) => c.name.toLowerCase().includes(term));
  });

  toggleDropdown() {
    this.isCountryDropdownOpen.update((v) => !v);
    if (this.isCountryDropdownOpen()) this.searchTerm.set('');
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

  // État du modal
  isModalOpen = signal(false);
  selectedCompany = signal<Company | null>(null);
  isDetailsModalOpen = signal(false);
  selectedCompanyForDetails = signal<Company | null>(null);

  // Modals validation/rejet
  showValidationModal = signal(false);
  showRejectModal = signal(false);
  companyToValidate = signal<Company | null>(null);
  companyToReject = signal<Company | null>(null);
  rejectReason = '';
  rejectReasonTouched = false;
  isValidating = signal(false);

  // Formulaire réactif
  companyForm!: FormGroup;

  // Signaux de données
  private companiesData = signal<Company[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  // Onglets
  currentTab = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Recherche et pagination
  searchQuery = signal<string>('');
  currentPage = signal(1);
  itemsPerPage = 6;

  // Tri
  sortColumn = signal<string>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  ngOnInit(): void {
    this.initForm();
    this.loadCompanies();
    this.loadCountries();
  }

  initForm() {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      country: [''],
      adminFullname: ['', Validators.required],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPhone: [''],
    });
  }

  loadCountries() {
    this.countryService.getCountries().subscribe((data) => {
      this.countries.set(data);
    });
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.companyService.getAll().subscribe({
      next: (response: any) => {
        const companiesArray = response.data || [];
        this.companiesData.set(companiesArray);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Erreur lors du chargement des entreprises');
        this.isLoading.set(false);
      },
    });
  }

  // Modals validation et rejet
  openValidationModal(company: Company) {
    this.companyToValidate.set(company);
    this.showValidationModal.set(true);
  }

  closeValidationModal() {
    this.showValidationModal.set(false);
    this.companyToValidate.set(null);
  }

  confirmValidation() {
    const company = this.companyToValidate();
    if (!company) return;

    this.isValidating.set(true);
    this.companyService.validate(company.id, 'accept', '').subscribe({
      next: () => {
        this.toastService.success('Entreprise validée avec succès');
        this.loadCompanies();
        this.closeValidationModal();
        this.isValidating.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Erreur lors de la validation');
        this.isValidating.set(false);
      },
    });
  }

  openRejectModal(company: Company) {
    this.companyToReject.set(company);
    this.rejectReason = '';
    this.rejectReasonTouched = false;
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.companyToReject.set(null);
    this.rejectReason = '';
    this.rejectReasonTouched = false;
  }

  confirmReject() {
    if (!this.rejectReason.trim()) {
      this.rejectReasonTouched = true;
      return;
    }

    const company = this.companyToReject();
    if (!company) return;

    this.isValidating.set(true);
    this.companyService.validate(company.id, 'reject', this.rejectReason).subscribe({
      next: () => {
        this.toastService.success('Entreprise rejetée');
        this.loadCompanies();
        this.closeRejectModal();
        this.isValidating.set(false);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Erreur lors du rejet');
        this.isValidating.set(false);
      },
    });
  }

  // Gestion du modal de création/modification
  openCreateModal() {
    this.selectedCompany.set(null);
    this.resetForm();
    this.resetFiles();
    this.isModalOpen.set(true);
  }

  openEditModal(company: Company) {
    this.selectedCompany.set(company);

    this.companyForm.patchValue({
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      country: company.country || '',
      adminFullname: company.users?.[0]?.fullname || '',
      adminEmail: company.users?.[0]?.email || '',
      adminPhone: company.users?.[0]?.phone || '',
    });

    if (company.logo) {
      this.logoPreview.set(this.getMediaUrl(company.logo, 'logos'));
    }

    if (company.users?.[0]?.photoProfile) {
      this.photoProfilePreview.set(this.getMediaUrl(company.users?.[0]?.photoProfile, 'photos'));
    }

    this.resetFiles();
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedCompany.set(null);
    this.resetForm();
    this.resetFiles();
  }

  // Gestion des fichiers
  onFileSelected(event: any, type: 'logo' | 'photoProfile' | 'rccm' | 'nif') {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('Le fichier ne doit pas dépasser 5 Mo');
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
        break;
      case 'nif':
        this.selectedNif.set(file);
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
        break;
      case 'nif':
        this.selectedNif.set(null);
        break;
    }
    if (inputElement) {
      inputElement.value = '';
    }
  }

  // CRUD actions
  saveCompany() {
    if (this.companyForm.invalid) {
      this.toastService.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const formValue = this.companyForm.value;
    const formData = new FormData();

    // Champs Company
    if (formValue.name) formData.append('name', formValue.name);
    if (formValue.email) formData.append('email', formValue.email);
    if (formValue.phone) formData.append('phone', formValue.phone);
    if (formValue.address) formData.append('address', formValue.address);
    if (formValue.country) formData.append('country', formValue.country);

    // Champs administrateur
    if (formValue.adminFullname) formData.append('adminFullname', formValue.adminFullname);
    if (formValue.adminEmail) formData.append('adminEmail', formValue.adminEmail);
    if (formValue.adminPhone) formData.append('adminPhone', formValue.adminPhone);

    // Fichiers
    if (this.selectedLogo()) formData.append('logo', this.selectedLogo()!);
    if (this.selectedPhotoProfile()) formData.append('photoProfile', this.selectedPhotoProfile()!);
    if (this.selectedRccm()) formData.append('rccmDoc', this.selectedRccm()!);
    if (this.selectedNif()) formData.append('nifDoc', this.selectedNif()!);

    this.isSaving.set(true);

    if (this.selectedCompany()) {
      this.companyService.updateCompany(this.selectedCompany()!.id, formData).subscribe({
        next: () => {
          this.toastService.success('Entreprise modifiée avec succès');
          this.loadCompanies();
          this.closeModal();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erreur lors de la modification');
          this.isSaving.set(false);
        },
      });
    } else {
      this.companyService.createCompany(formData).subscribe({
        next: () => {
          this.toastService.success('Entreprise créée avec succès');
          this.loadCompanies();
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

  // Logique de filtrage
  filteredByTab = computed(() => {
    const tab = this.currentTab();
    const all = this.companiesData();
    if (tab === 'pending') return all.filter((c) => c.accountStatus === 'pending');
    if (tab === 'approved') return all.filter((c) => c.accountStatus === 'approved');
    if (tab === 'rejected') return all.filter((c) => c.accountStatus === 'rejected');
    return all;
  });

  searchedCompanies = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const data = this.filteredByTab();
    if (!query) return data;
    return data.filter(
      (company) =>
        company.name?.toLowerCase().includes(query) ||
        company.email?.toLowerCase().includes(query) ||
        company.phone?.toLowerCase().includes(query) ||
        company.address?.toLowerCase().includes(query) ||
        company.users?.[0]?.fullname?.toLowerCase().includes(query) ||
        company.users?.[0]?.email?.toLowerCase().includes(query),
    );
  });

  // Logique de tri
  sortedCompanies = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const data = this.searchedCompanies();
    const sorted = [...data];
    return sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      if (column === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (column === 'adminName') {
        aVal = a.users?.[0]?.fullname || '';
        bVal = b.users?.[0]?.fullname || '';
      } else if (column === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      } else {
        aVal = a[column as keyof Company] || '';
        bVal = b[column as keyof Company] || '';
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  // Pagination
  paginatedCompanies = computed(() => {
    return this.utilsService.paginate(
      this.sortedCompanies(),
      this.currentPage(),
      this.itemsPerPage,
    );
  });

  // Statistiques
  totalCompanies = computed(() => this.companiesData().length);
  activeCompaniesCount = computed(
    () => this.companiesData().filter((c) => c.accountStatus === 'approved').length,
  );
  pendingCompaniesCount = computed(
    () => this.companiesData().filter((c) => c.accountStatus === 'pending').length,
  );
  rejectedCompaniesCount = computed(
    () => this.companiesData().filter((c) => c.accountStatus === 'rejected').length,
  );

  // Navigation et UI
  onSearch() {
    this.currentPage.set(1);
  }

  sortBy(column: string) {
    const newDir = this.utilsService.handleSort(column, this.sortColumn(), this.sortDirection());
    this.sortColumn.set(column);
    this.sortDirection.set(newDir as 'asc' | 'desc');
  }

  setTab(tab: 'all' | 'pending' | 'approved' | 'rejected') {
    this.currentTab.set(tab);
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  totalPages = computed(() =>
    this.utilsService.getTotalPages(this.sortedCompanies().length, this.itemsPerPage),
  );
  startIndex = computed(() =>
    this.utilsService.getStartIndex(
      this.currentPage(),
      this.itemsPerPage,
      this.sortedCompanies().length,
    ),
  );
  endIndex = computed(() =>
    this.utilsService.getEndIndex(
      this.currentPage(),
      this.itemsPerPage,
      this.sortedCompanies().length,
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

  resetForm() {
    this.companyForm.reset({
      name: '',
      email: '',
      phone: '',
      address: '',
      country: '',
      adminFullname: '',
      adminEmail: '',
      adminPhone: '',
    });
  }

  resetFiles() {
    this.selectedLogo.set(null);
    this.logoPreview.set(null);
    this.selectedPhotoProfile.set(null);
    this.photoProfilePreview.set(null);
    this.selectedRccm.set(null);
    this.selectedNif.set(null);
  }

  // Modal détails
  viewCompanyDetails(company: Company) {
    this.selectedCompanyForDetails.set(company);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal() {
    this.isDetailsModalOpen.set(false);
    this.selectedCompanyForDetails.set(null);
  }

  // Styles dynamiques
  getValidationStyles(statut: string): string {
    switch (statut) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'rejected':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  getValidationLabel(statut: string): string {
    switch (statut) {
      case 'approved':
        return 'Validée';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Refusée';
      default:
        return statut || 'Non défini';
    }
  }

  getMediaUrl(
    fileName: string | null | undefined,
    folder: 'photos' | 'logos' | 'documents' | 'invoices' | 'qrcodes' = 'documents',
  ): string {
    if (!fileName) return '';
    return this.mediaService.getMediaUrl(fileName, folder);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Non renseignée';
    return new Date(date).toLocaleDateString('fr-GN');
  }
}
