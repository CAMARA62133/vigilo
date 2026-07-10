import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PlanService } from '../../core/services/plan.service';
import { Plan } from '../../core/models/Plan.model';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './plans.html',
})
export class Plans implements OnInit {
  private planService = inject(PlanService);
  private fb = inject(FormBuilder);

  plans: Plan[] = [];
  isLoading = false;
  isModalOpen = false;
  isEditMode = false;
  selectedPlan: Plan | null = null;

  planForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', [Validators.required, Validators.minLength(2)]],
    priceMonthly: [0, [Validators.required, Validators.min(0)]],
    quotas: this.fb.group({
      maxAgents: [0, [Validators.required, Validators.min(0)]],
      maxSites: [0, [Validators.required, Validators.min(0)]],
      maxCheckpoints: [0, [Validators.required, Validators.min(0)]],
    }),
    features: this.fb.group({
      reports: [false],
      messaging: [false],
      ai_chat: [false],
    }),
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading = true;

    this.planService.getAll().subscribe({
      next: (res) => {
        this.plans = res.data || []; // ✅ IMPORTANT
        this.isLoading = false;
      },
      error: () => {
        this.plans = []; // ✅ sécurité
        this.isLoading = false;
      },
    });
  }
  // Si vous utilisez des variables classiques
  get activePlansCount(): number {
    return this.plans ? this.plans.filter((p) => p.isActive).length : 0;
  }

  get inactivePlansCount(): number {
    return this.plans ? this.plans.filter((p) => !p.isActive).length : 0;
  }
  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedPlan = null;
    this.planForm.reset({
      name: '',
      code: '',
      priceMonthly: 0,
      quotas: { maxAgents: 0, maxSites: 0, maxCheckpoints: 0 },
      features: { reports: false, messaging: false, ai_chat: false },
      isActive: true,
    });
    this.isModalOpen = true;
  }

  openEditModal(plan: Plan): void {
    this.isEditMode = true;
    this.selectedPlan = plan;
    this.planForm.patchValue({
      name: plan.name,
      code: plan.code,
      priceMonthly: plan.priceMonthly,
      quotas: plan.quotas,
      features: plan.features,
      isActive: plan.isActive,
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedPlan = null;
    this.planForm.reset();
  }

  savePlan(): void {
    if (this.planForm.invalid) {
      Object.keys(this.planForm.controls).forEach((key) => {
        const control = this.planForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const formData = this.planForm.value;

    if (this.isEditMode && this.selectedPlan) {
      this.planService.update(this.selectedPlan.id, formData).subscribe({
        next: () => {
          this.loadPlans();
          this.closeModal();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.planService.create(formData).subscribe({
        next: () => {
          this.loadPlans();
          this.closeModal();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
    }
  }

  togglePlanStatus(plan: Plan): void {
    this.planService.toggleStatus(plan.id).subscribe({
      next: () => {
        this.loadPlans();
      },
      error: () => {},
    });
  }

  getStatusColor(isActive: boolean): string {
    return isActive
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  }
}
