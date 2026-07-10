// sites.component.ts
import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Site } from '../../../core/models/Site.model';
import { SiteService } from '../../../core/services/site.service';
import * as L from 'leaflet';
import { MediaService } from '../../../core/services/media.service';
import { ToastService } from '../../../core/services/toash.service';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sites.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sites implements OnInit, AfterViewInit, OnDestroy {
  private siteService = inject(SiteService);
  private toastService = inject(ToastService);
  private mediaService = inject(MediaService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Signaux pour l'état des données
  sites = signal<Site[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  currentPage = signal(1);
  itemsPerPage = 8;

  // Signaux pour la gestion des modaux
  modalOpen = signal(false);
  editingSite = signal<Site | null>(null);

  // Formulaire Réactif basé sur le modèle Site
  siteForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    address: [''],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    securityRadius: [100, [Validators.required, Validators.min(10)]],
    ownerInfo: this.fb.group({
      fullname: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    }),
  });

  mapInstances: Map<string, L.Map> = new Map();

  ngOnInit() {
    this.loadSites();
  }

  ngAfterViewInit() {
    // Les cartes seront initialisées après le chargement des données
  }

  ngOnDestroy() {
    this.mapInstances.forEach((map) => {
      if (map) map.remove();
    });
    this.mapInstances.clear();
  }

  loadSites() {
    this.isLoading.set(true);
    this.siteService.getAll().subscribe({
      next: (response) => {
        this.sites.set(response.data);
        this.isLoading.set(false);
        setTimeout(() => this.initAllMaps(), 200);
      },
      error: (err) => {
        console.error('Erreur chargement sites:', err);
        this.toastService.error('Erreur lors du chargement des sites');
        this.isLoading.set(false);
      },
    });
  }

  initAllMaps() {
    this.mapInstances.forEach((map) => {
      if (map) map.remove();
    });
    this.mapInstances.clear();

    this.paginatedSites().forEach((site) => {
      const containerId = `map-${site.id}`;
      const container = document.getElementById(containerId);

      if (container && !container.classList.contains('leaflet-container')) {
        const lat = site.latitude;
        const lng = site.longitude;

        const mapInstance = L.map(containerId, {
          center: [lat, lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
        }).addTo(mapInstance);

        // Cercle de géofencing
        L.circle([lat, lng], {
          radius: site.securityRadius || 100,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1.5,
        }).addTo(mapInstance);

        // Marqueur personnalisé
        L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>`,
            className: 'custom-div-icon',
            iconSize: [16, 16],
          }),
        }).addTo(mapInstance);

        this.mapInstances.set(site.id!, mapInstance);
        setTimeout(() => mapInstance.invalidateSize(), 200);
      }
    });
  }

  refreshMaps() {
    setTimeout(() => this.initAllMaps(), 150);
  }

  // Computed properties
  filteredSites = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.sites().filter(
      (site) =>
        site.name.toLowerCase().includes(query) ||
        site.address?.toLowerCase().includes(query) ||
        false,
    );
  });

  activeSitesCount = computed(() => this.sites().filter((s) => s.isActive === true).length);

  totalAgents = computed(() => {
    return this.sites().reduce((sum, site) => {
      return sum + (site.activeAgents || 0);
    }, 0);
  });

  paginatedSites = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredSites().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.filteredSites().length / this.itemsPerPage));
  startIndex = computed(() => (this.currentPage() - 1) * this.itemsPerPage);
  endIndex = computed(() =>
    Math.min(this.startIndex() + this.itemsPerPage, this.filteredSites().length),
  );

  // Méthodes de pagination
  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.currentPage.set(1);
    setTimeout(() => this.refreshMaps(), 100);
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.refreshMaps();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.refreshMaps();
    }
  }

  goToPage(page: number | string) {
    if (typeof page === 'number') {
      this.currentPage.set(page);
      this.refreshMaps();
    }
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }
    return pages;
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  // Gestion du Modal
  openModal() {
    this.editingSite.set(null);
    this.siteForm.reset({
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      securityRadius: 100,
      ownerInfo: {
        fullname: '',
        phone: '',
        email: '',
      },
    });
    this.modalOpen.set(true);
  }

  openEditModal(site: Site) {
    this.editingSite.set(site);
    this.siteForm.patchValue({
      name: site.name,
      address: site.address || '',
      latitude: site.latitude,
      longitude: site.longitude,
      securityRadius: site.securityRadius,
      ownerInfo: {
        fullname: site.ownerInfo!.fullname || '',
        phone: site.ownerInfo!.phone || '',
        email: site.ownerInfo!.email || '',
      },
    });
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.editingSite.set(null);
  }

  saveSite() {
    if (this.siteForm.invalid) {
      this.siteForm.markAllAsTouched();
      this.toastService.error('Veuillez remplir correctement tous les champs obligatoires');
      return;
    }

    const formData = this.siteForm.value;
    this.isLoading.set(true);

    if (this.editingSite()) {
      this.siteService.update(this.editingSite()!.id!, formData).subscribe({
        next: () => {
          this.toastService.success('Site modifié avec succès');
          this.loadSites();
          this.closeModal();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur mise à jour:', err);
          this.toastService.error(err.error?.message || 'Erreur lors de la modification');
          this.isLoading.set(false);
        },
      });
    } else {
      this.siteService.create(formData).subscribe({
        next: () => {
          this.toastService.success('Site créé avec succès');
          this.loadSites();
          this.closeModal();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur création:', err);
          this.toastService.error(err.error?.message || 'Erreur lors de la création');
          this.isLoading.set(false);
        },
      });
    }
  }

  toggleStatus(site: Site) {
    if (!site.id) return;

    const newStatus = !site.isActive;
    this.siteService.update(site.id, { isActive: newStatus }).subscribe({
      next: () => {
        this.toastService.success(`Site ${newStatus ? 'activé' : 'désactivé'} avec succès`);
        this.loadSites();
      },
      error: (err) => {
        console.error('Erreur changement statut:', err);
        this.toastService.error('Impossible de modifier le statut');
      },
    });
  }

  getDetails(site: Site) {
    this.router.navigate(['/detail-sites', site.id]);
  }

  getTotalCheckpoints(site: Site): number {
    return site.checkpointCount || 0;
  }

  getTotalAgentAffecter(site: Site): number {
    return site.activeAgents || 0;
  }

  getMediaUrl(path: string): string {
    return this.mediaService.getMediaUrl(path, 'qrcodes');
  }
}
