// src/app/pages/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';


Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('revenueLineChart') revenueLineChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('plansPieChart') plansPieChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logsLineChart') logsLineChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scansLineChart') scansLineChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('affectationsPieChart') affectationsPieChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('incidentsLineChart') incidentsLineChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('myScansLineChart') myScansLineChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('myAffectationsPieChart') myAffectationsPieChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('myIncidentsLineChart') myIncidentsLineChart!: ElementRef<HTMLCanvasElement>;

  dashboardData: any | null = null;
  loading = true;
  error: string | null = null;

  periodForm: FormGroup;
  periodOptions = [
    { value: 'day', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  private destroy$ = new Subject<void>();
  private charts: Chart[] = [];

  // KPI animation values
  animatedStats: any = {};

  constructor(
    private dashboardService: DashboardService,
    private fb: FormBuilder,
  ) {
    this.periodForm = this.fb.group({
      period: ['day'],
    });
  }

  ngOnInit(): void {
    this.loadDashboardStats();

    this.periodForm
      .get('period')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardStats();
      });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.charts.forEach((chart) => chart.destroy());
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = null;

    const period = this.periodForm.get('period')?.value;

    this.dashboardService
      .getStats(period)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.dashboardData = response.data;
            this.animateKPIs();
            setTimeout(() => this.initCharts(), 200);
          } else {
            this.error = 'Erreur lors du chargement des données';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Dashboard error:', err);
          this.error = 'Erreur de connexion au serveur';
          this.loading = false;
        },
      });
  }

  animateKPIs(): void {
    if (!this.dashboardData) return;

    const targets = this.getKPITargets();
    const start = performance.now();
    const duration = 1000;

    const animate = (t: number) => {
      const p = Math.min((t - start) / duration, 1);

      const animated: any = {};
      Object.keys(targets).forEach((key) => {
        animated[key] = Math.floor(targets[key] * p);
      });

      this.animatedStats = animated;

      if (p < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  getKPITargets(): any {
    if (!this.dashboardData) return {};

    if (this.isSuperAdmin()) {
      const data = this.dashboardData ;
      return {
        totalCompanies: data.stats.totalCompanies,
        totalLogs: data.stats.totalLogs,
        totalRevenue: data.stats.totalRevenue,
        totalPlans: data.stats.totalPlans,
      };
    }

    if (this.isCompanyAdmin()) {
      const data = this.dashboardData ;
      return {
        totalAgents: data.stats.totalAgents,
        totalSites: data.stats.totalSites,
        totalIncidents: data.stats.totalIncidents,
        activeAffectations: data.stats.activeAffectations,
      };
    }

    if (this.isAgent()) {
      const data = this.dashboardData ;
      return {
        myScans: data.stats.myScans,
        myIncidents: data.stats.myIncidents,
        myAffectations: data.stats.myAffectations,
        activeAffectations: data.stats.activeAffectations,
      };
    }

    return {};
  }

  initCharts(): void {
    if (!this.dashboardData) return;

    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];

    if (this.isSuperAdmin()) {
      this.initSuperAdminCharts(this.dashboardData );
    } else if (this.isCompanyAdmin()) {
      this.initCompanyAdminCharts(this.dashboardData );
    } else if (this.isAgent()) {
      this.initAgentCharts(this.dashboardData );
    }
  }

  initSuperAdminCharts(data:any): void {
    // Revenue chart
    if (data.charts.revenueByDay?.length && this.revenueLineChart) {
      setTimeout(() => {
        if (this.revenueLineChart?.nativeElement) {
          this.createLineChart(
            this.revenueLineChart.nativeElement,
            data.charts.revenueByDay.map((item: { date: any; }) => item.date),
            data.charts.revenueByDay.map((item: { total: any; }) => item.total),
            'Revenus (FCFA)',
            '#10B981',
          );
        }
      }, 100);
    }

    // Plans by status chart
    if (data.charts.plansByStatus?.length && this.plansPieChart) {
      setTimeout(() => {
        if (this.plansPieChart?.nativeElement) {
          this.createPieChart(
            this.plansPieChart.nativeElement,
            data.charts.plansByStatus.map((item: { isActive: any; }) => (item.isActive ? 'Actifs' : 'Inactifs')),
            data.charts.plansByStatus.map((item: { count: any; }) => item.count),
            ['#10B981', '#EF4444'],
          );
        }
      }, 100);
    }

    // Logs chart
    if (data.charts.logsByDay?.length && this.logsLineChart) {
      setTimeout(() => {
        if (this.logsLineChart?.nativeElement) {
          this.createLineChart(
            this.logsLineChart.nativeElement,
            data.charts.logsByDay.map((item: { date: any; }) => item.date),
            data.charts.logsByDay.map((item: { count: any; }) => item.count),
            'Logs',
            '#6366F1',
          );
        }
      }, 100);
    }
  }

  initCompanyAdminCharts(data: any): void {
    // Scans chart
    if (data.charts.scansByDay?.length && this.scansLineChart) {
      setTimeout(() => {
        if (this.scansLineChart?.nativeElement) {
          this.createLineChart(
            this.scansLineChart.nativeElement,
            data.charts.scansByDay.map((item: { date: any; }) => item.date),
            data.charts.scansByDay.map((item: { count: any; }) => item.count),
            'Scans',
            '#3B82F6',
          );
        }
      }, 100);
    }

    // Affectations by status chart
    if (data.charts.affectationsByStatus?.length && this.affectationsPieChart) {
      setTimeout(() => {
        if (this.affectationsPieChart?.nativeElement) {
          this.createPieChart(
            this.affectationsPieChart.nativeElement,
            data.charts.affectationsByStatus.map((item: { status: string; }) => this.getStatusLabel(item.status)),
            data.charts.affectationsByStatus.map((item: { count: any; }) => item.count),
            ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'],
          );
        }
      }, 100);
    }

    // Incidents chart
    if (data.charts.incidentsByDay?.length && this.incidentsLineChart) {
      setTimeout(() => {
        if (this.incidentsLineChart?.nativeElement) {
          this.createLineChart(
            this.incidentsLineChart.nativeElement,
            data.charts.incidentsByDay.map((item: { date: any; }) => item.date),
            data.charts.incidentsByDay.map((item: { count: any; }) => item.count),
            'Incidents',
            '#EF4444',
          );
        }
      }, 100);
    }
  }

  initAgentCharts(data:any): void {
    // My scans chart
    if (data.charts.myScansByDay?.length && this.myScansLineChart) {
      setTimeout(() => {
        if (this.myScansLineChart?.nativeElement) {
          this.createLineChart(
            this.myScansLineChart.nativeElement,
            data.charts.myScansByDay.map((item: { date: any; }) => item.date),
            data.charts.myScansByDay.map((item: { count: any; }) => item.count),
            'Mes scans',
            '#3B82F6',
          );
        }
      }, 100);
    }

    // My affectations status chart
    if (data.charts.myAffectationsStatus?.length && this.myAffectationsPieChart) {
      setTimeout(() => {
        if (this.myAffectationsPieChart?.nativeElement) {
          this.createPieChart(
            this.myAffectationsPieChart.nativeElement,
            data.charts.myAffectationsStatus.map((item: { status: string; }) => this.getStatusLabel(item.status)),
            data.charts.myAffectationsStatus.map((item: { count: any; }) => item.count),
            ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'],
          );
        }
      }, 100);
    }

    // My incidents chart
    if (data.charts.myIncidentsByDay?.length && this.myIncidentsLineChart) {
      setTimeout(() => {
        if (this.myIncidentsLineChart?.nativeElement) {
          this.createLineChart(
            this.myIncidentsLineChart.nativeElement,
            data.charts.myIncidentsByDay.map((item: { date: any; }) => item.date),
            data.charts.myIncidentsByDay.map((item: { count: any; }) => item.count),
            'Mes incidents',
            '#EF4444',
          );
        }
      }, 100);
    }
  }

  // Getters pour faciliter l'accès typé dans le template
  get superAdminCharts() {
    return (this.dashboardData )?.charts;
  }

  get companyAdminCharts() {
    return (this.dashboardData )?.charts;
  }

  get agentCharts() {
    return (this.dashboardData )?.charts;
  }

  createLineChart(
    canvas: HTMLCanvasElement,
    labels: string[],
    data: number[],
    label: string,
    color: string,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            borderColor: color,
            backgroundColor: `${color}20`,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
        },
      },
    });

    this.charts.push(chart);
  }

  createPieChart(
    canvas: HTMLCanvasElement,
    labels: string[],
    data: number[],
    colors: string[],
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    this.charts.push(chart);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Actives',
      planned: 'Planifiées',
      finished: 'Terminées',
      cancelled: 'Annulées',
    };
    return labels[status] || status;
  }

  refreshStats(): void {
    this.loadDashboardStats();
  }

  isSuperAdmin(): boolean {
    return this.dashboardData?.role === 'super_admin';
  }

  isCompanyAdmin(): boolean {
    return this.dashboardData?.role === 'company_admin';
  }

  isAgent(): boolean {
    return this.dashboardData?.role === 'agent';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getWelcomeMessage(): string {
    if (this.isSuperAdmin()) return 'Vue globale de la plateforme';
    if (this.isCompanyAdmin()) return 'Gestion de votre entreprise';
    if (this.isAgent()) return 'Mon activité personnelle';
    return 'Tableau de bord';
  }
}