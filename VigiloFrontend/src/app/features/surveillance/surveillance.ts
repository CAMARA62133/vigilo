// surveillance.component.ts - Version corrigée
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  AfterViewInit,
  inject,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { AgentService } from '../../core/services/agent.service';
import { SiteService } from '../../core/services/site.service';
import { CheckpointService } from '../../core/services/checkpoint.service';
import {
  SocketService,
  GpsLiveData,
  CheckpointValidatedData,
  AlertLiveData,
  SessionEndedData,
} from '../../core/services/socket.service';
import { WorkSessionService } from '../../core/services/work-session.service';
import { AuthService } from '../../core/services/auth.service';
import { Agent } from '../../core/models/Agent.model';
import { Site } from '../../core/models/Site.model';
import { Checkpoint, CheckpointPassage } from '../../core/models/Checkpoint.model';
import { WorkSession } from '../../core/models/Work-session.model';
import { ToastService } from '../../core/services/toash.service';
import { Notifications } from '../../core/models/notification.model';
import { User } from '../../core/models/user.model';

// Fix pour les icônes Leaflet par défaut
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Interface pour les alertes UI (différente du modèle backend Notification)




@Component({
  selector: 'app-surveillance',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './surveillance.html',
  styleUrls: ['./surveillance.scss'],
})
export class Surveillance implements OnInit, OnDestroy, AfterViewInit {
  private agentService = inject(AgentService);
  private toastService = inject(ToastService);
  private siteService = inject(SiteService);
  private checkpointService = inject(CheckpointService);
  private socketService = inject(SocketService);
  private workSessionService = inject(WorkSessionService);
  private authService = inject(AuthService);

  // UI State
  sidebarCollapsed = signal(false);
  selectedAgent = signal<Agent | null>(null);
  selectedSite = signal<Site | null>(null);
  selectedCheckpoint = signal<Checkpoint | null>(null);
  selectedView = signal<'map' | 'agents' | 'alerts' | 'sites'>('map');
  activeTab = signal<'overview' | 'sessions' | 'alerts' | 'sites'>('sessions');

  // Site detail state
  selectedSiteCheckpoints = signal<Checkpoint[]>([]);
  showSiteDetails = signal(false);
  checkpointPassages = signal<CheckpointPassage[]>([]);

  // Map variables
  private mapInstance: L.Map | null = null;
  private markers: L.Marker[] = []; // ✅ CORRIGÉ: L.Marker[]
  private siteMarkers: L.Marker[] = [];
  private checkpointMarkers: L.Marker[] = [];
  private circleMarkers: L.Circle[] = [];
  private trailLines: Map<string, L.Polyline> = new Map();
  private animatedMarkers: Map<string, L.Marker> = new Map();
  private isMapInitialized = false;
  private refreshInterval: any = null;

  // Data signals
  private agents = signal<Agent[]>([]);
  sites = signal<Site[]>([]);
  private checkpoints = signal<Checkpoint[]>([]); // ✅ Type corrigé
  private liveSessions = signal<WorkSession[]>([]);

  alerts = signal<Notifications[]>([]); // ✅ Type corrigé
  isLoading = signal(false);

  // Positions GPS pour les agents
  private agentPositions = signal<Map<string, { lat: number; lng: number; timestamp: Date }>>(
    new Map(),
  );
  private agentTrails = signal<Map<string, Array<{ lat: number; lng: number; timestamp: Date }>>>(
    new Map(),
  );

  // Map des checkpoints validés (basée sur les passages réels)
  private validatedCheckpoints = new Map<string, { validatedAt: Date; agentId: string }>();

  // Computed signals
  totalDistance = computed(() => {
    return this.liveSessions()
      .reduce((sum, session) => sum + (session.totalDistanceKm || 0), 0)
      .toFixed(1);
  });

  activeAgents = computed(() => {
    return this.liveSessions().length;
  });

  onlineAgents = computed(() => {
    return this.agents().filter((agent) => agent.status === 'working' || agent.status === 'idle')
      .length;
  });

  activeSessions = computed(() => {
    return this.liveSessions().length;
  });

  totalCheckpointsVisited = computed(() => {
    return this.liveSessions().reduce(
      (sum, session) => sum + (session.totalCheckpointsVisited || 0),
      0,
    );
  });

  recentAlerts = computed(() => {
    return this.alerts().slice(0, 5);
  });

  activeSessionsList = computed(() => {
    return this.liveSessions().slice(0, 5);
  });

  constructor() {
    // Écouter les événements Socket
    effect(() => {
      const gpsUpdate = this.socketService.lastGpsUpdate();
      if (gpsUpdate) {
        this.handleGpsUpdate(gpsUpdate);
      }
    });

    effect(() => {
      const checkpointValidated = this.socketService.checkpointValidated();
      if (checkpointValidated) {
        this.socketService.clearCheckpointValidated();
      }
    });

    effect(() => {
      const alertLive = this.socketService.alertLive();
      if (alertLive) {
        this.socketService.clearAlertLive();
      }
    });

    effect(() => {
      const sessionEnded = this.socketService.sessionEnded();
      if (sessionEnded) {
        this.socketService.clearSessionEnded();
      }
    });
  }

  ngOnInit() {
    this.initSocket();
    this.loadInitialData();
    this.startRefreshInterval();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      this.setupCheckpointClickHandler();
    }, 100);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.socketService.disconnect();
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  private initSocket() {
    const user = this.authService.user();
    if (user) {
      this.socketService.connect(user.id, user.companyId!, user.role);
    }
  }

  private startRefreshInterval() {
    this.refreshInterval = setInterval(() => {
      this.loadLiveSessions();
      this.loadCheckpoints();
    }, 30000);
  }

  private async loadInitialData() {
    this.isLoading.set(true);

    try {
      await this.loadAgents();

      await this.loadSites();

      // 👉 site sélectionné
      if (this.sites().length > 0) {
        this.selectedSite.set(this.sites()[0]);
      }

      await this.loadCheckpoints();
      await this.loadLiveSessions();
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.toastService.error('Erreur lors du chargement des données');
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadAgents(): Promise<void> {
    return new Promise((resolve) => {
      this.agentService.getAll().subscribe({
        next: (response: any) => {
          const agents = response?.data || response?.agents || response || [];
          this.agents.set(agents);
          resolve();
        },
        error: (err) => {
          console.error('Error loading agents:', err);
          this.toastService.error('Erreur lors du chargement des agents');
          resolve();
        },
      });
    });
  }

  private loadSites(): Promise<void> {
    return new Promise((resolve) => {
      this.siteService.getAll().subscribe({
        next: (response) => {
          this.sites.set(response.data);
          resolve();
        },
        error: (err) => {
          console.error('Error loading sites:', err);
          this.toastService.error('Erreur lors du chargement des sites');
          resolve();
        },
      });
    });
  }

  private loadCheckpoints(): Promise<void> {
    const site = this.selectedSite();

    if (!site?.id) {
      this.checkpoints.set([]);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.checkpointService.getBySite(site.id!).subscribe({
        next: (response: any) => {
          const data = response?.data || response;
          const checkpoints = Array.isArray(data) ? data : [];

          const updated = checkpoints.map((cp) => ({
            ...cp,
            isValidated: this.validatedCheckpoints.has(cp.id),
          }));

          this.checkpoints.set(updated);
          resolve();
        },
        error: (err) => {
          console.error(err);
          this.checkpoints.set([]);
          resolve();
        },
      });
    });
  }

  private loadLiveSessions(): Promise<void> {
    return new Promise((resolve) => {
      this.workSessionService.getLivePositions().subscribe({
        next: (response: any) => {
          const sessions = response?.data || [];
          this.liveSessions.set(sessions);

          const newPositions = new Map(this.agentPositions());
          sessions.forEach((session: WorkSession) => {
            if (session.lastLatitude && session.lastLongitude) {
              newPositions.set(session.agent.id, {
                lat: session.lastLatitude,
                lng: session.lastLongitude,
                timestamp: new Date(session.lastActivityAt || Date.now()),
              });
            }
          });
          this.agentPositions.set(newPositions);

          this.updateMap();
          resolve();
        },
        error: (err) => {
          console.error('Error loading live sessions:', err);
          resolve();
        },
      });
    });
  }

  private handleGpsUpdate(data: GpsLiveData) {
    const newPositions = new Map(this.agentPositions());
    newPositions.set(data.agentId, {
      lat: data.latitude,
      lng: data.longitude,
      timestamp: new Date(data.timestamp),
    });
    this.agentPositions.set(newPositions);

    const currentTrail = this.agentTrails().get(data.agentId) || [];
    const newTrail = [
      ...currentTrail,
      { lat: data.latitude, lng: data.longitude, timestamp: new Date(data.timestamp) },
    ];
    this.agentTrails.set(new Map(this.agentTrails().set(data.agentId, newTrail)));

    const updatedSessions = this.liveSessions().map((session) => {
      if (session.agent.id === data.agentId) {
        return {
          ...session,
          lastLatitude: data.latitude,
          lastLongitude: data.longitude,
          totalDistanceKm: data.totalDistanceKm,
          lastActivityAt: new Date(),
        };
      }
      return session;
    });
    this.liveSessions.set(updatedSessions);

    this.animateAgentMovement(data.agentId, {
      lat: data.latitude,
      lng: data.longitude,
      timestamp: new Date(data.timestamp),
    });

    this.updateMap();
  }

  private animateAgentMovement(
    agentId: string,
    newPosition: { lat: number; lng: number; timestamp: Date },
  ) {
    const currentMarker = this.animatedMarkers.get(agentId);
    if (currentMarker && this.mapInstance) {
      const currentPos = currentMarker.getLatLng();
      const steps = 20;
      let step = 0;

      const animate = () => {
        if (step <= steps) {
          const t = step / steps;
          const lat = currentPos.lat + (newPosition.lat - currentPos.lat) * t;
          const lng = currentPos.lng + (newPosition.lng - currentPos.lng) * t;
          currentMarker.setLatLng([lat, lng]);
          step++;
          requestAnimationFrame(animate);
        } else {
          currentMarker.setLatLng([newPosition.lat, newPosition.lng]);
        }
      };
      animate();
    }
  }

  private initMap() {
    const element = document.getElementById('surveillance-map');
    if (!element || this.isMapInitialized) return;

    this.mapInstance = L.map('surveillance-map', {
      center: [5.3456, -4.0266],
      zoom: 14,
      zoomControl: true,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 3,
    }).addTo(this.mapInstance);

    this.isMapInitialized = true;

    setTimeout(() => {
      if (this.mapInstance) {
        this.mapInstance.invalidateSize();
        this.updateMap();
      }
    }, 300);
  }

  updateMap() {
    if (!this.mapInstance || !this.isMapInitialized) return;

    this.markers.forEach((m) => m.remove());
    this.siteMarkers.forEach((m) => m.remove());
    this.checkpointMarkers.forEach((m) => m.remove());
    this.circleMarkers.forEach((c) => c.remove());
    this.trailLines.forEach((line) => line.remove());

    this.markers = [];
    this.siteMarkers = [];
    this.checkpointMarkers = [];
    this.circleMarkers = [];
    this.trailLines.clear();

    this.drawSites();
    this.drawCheckpoints();
    this.drawTrails();
    this.drawAgents();
    this.fitMapBounds();
  }

  private drawSites() {
    const isDark = document.documentElement.classList.contains('dark');
    const popupBg = isDark ? '#1e293b' : '#1f2937';
    const popupText = isDark ? '#e2e8f0' : '#ffffff';
    const popupBorder = isDark ? '#334155' : '#374151';
    const popupSubtext = isDark ? '#94a3b8' : '#9ca3af';

    this.sites().forEach((site) => {
      if (!site.latitude || !site.longitude) return;

      const circle = L.circle([site.latitude, site.longitude], {
        radius: site.securityRadius,
        color: '#f97316',
        weight: 3,
        opacity: 0.8,
        fillColor: '#f97316',
        fillOpacity: 0.1,
        className: 'security-zone',
        dashArray: '5, 10',
      }).addTo(this.mapInstance!);

      const pulseCircle = L.circle([site.latitude, site.longitude], {
        radius: site.securityRadius,
        color: '#f97316',
        weight: 1,
        opacity: 0.4,
        fillColor: 'transparent',
        className: 'pulse-ring',
      }).addTo(this.mapInstance!);

      this.circleMarkers.push(circle, pulseCircle);

      const siteIcon = L.divIcon({
        html: `<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(249,115,22,0.4);">
        <i class="fa-solid fa-building" style="color: white; font-size: 20px;"></i>
      </div>`,
        className: 'custom-marker site-marker',
        iconSize: [48, 48],
        popupAnchor: [0, -24],
      });

      const siteCheckpoints = this.checkpoints().filter((cp) => cp.siteId === site.id);

      const popupContent = `
      <div style="min-width: 250px; padding: 12px; background: ${popupBg}; border-radius: 12px; color: ${popupText}; border: 1px solid ${popupBorder};">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid ${popupBorder}; padding-bottom: 8px;">
          <i class="fa-solid fa-shield-haltered" style="color: #f97316; font-size: 24px;"></i>
          <div>
            <strong style="font-size: 16px; color: ${popupText};">${site.name}</strong><br>
            <small style="color: ${popupSubtext};">${site.code}</small>
          </div>
        </div>
        <div style="margin-bottom: 8px; color: ${popupText};">
          <i class="fa-solid fa-location-dot" style="color: #f97316; width: 20px;"></i>
          <span style="margin-left: 8px;">${site.address || 'Adresse non définie'}</span>
        </div>
        <div style="margin-bottom: 12px; color: ${popupText};">
          <i class="fa-solid fa-circle-radiation" style="color: #f97316; width: 20px;"></i>
          <span style="margin-left: 8px;">Rayon: ${site.securityRadius}m</span>
        </div>
        <div style="margin-top: 12px;">
          <div style="font-size: 12px; color: ${popupSubtext}; margin-bottom: 8px;">POINTS DE CONTRÔLE</div>
          ${siteCheckpoints
            .map(
              (cp) => `
            <div onclick="window.handleCheckpointClick('${cp.id}')" style="cursor: pointer; padding: 6px 8px; background: ${cp.isActive ? '#22c55e20' : isDark ? '#334155' : '#374151'}; margin: 4px 0; border-radius: 6px; display: flex; align-items: center; gap: 8px; color: ${popupText};">
              ${cp.isActive ? '<i class="fa-solid fa-check-circle" style="color: #22c55e;"></i>' : '<i class="fa-regular fa-circle" style="color: #f97316;"></i>'}
              <span style="flex: 1;">${cp.name}</span>
              ${cp.isActive ? '<span style="font-size: 10px; color: #22c55e;">✓ Validé</span>' : ''}
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

      const marker = L.marker([site.latitude, site.longitude], {
        icon: siteIcon,
      })
        .addTo(this.mapInstance!)
        .bindPopup(popupContent, { className: 'custom-popup', maxWidth: 300 });

      marker.on('click', () => this.selectedSite.set(site));
      this.siteMarkers.push(marker);
    });
  }

  private drawCheckpoints() {
    const isDark = document.documentElement.classList.contains('dark');
    const popupBg = isDark ? '#1e293b' : '#ffffff';
    const popupText = isDark ? '#e2e8f0' : '#1f2937';
    const popupSubtext = isDark ? '#94a3b8' : '#6b7280';

    this.checkpoints().forEach((cp) => {
      if (!cp.latitude || !cp.longitude) return;

      const isValidated = cp.isActive || false;
      const checkpointIcon = L.divIcon({
        html: `<div style="width: 32px; height: 32px; background: ${isValidated ? '#22c55e' : '#f97316'}; border-radius: 50%; border: 2px solid ${isDark ? '#1e293b' : 'white'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 ${isValidated ? '15px' : '10px'} ${isValidated ? 'rgba(34,197,94,0.6)' : 'rgba(249,115,22,0.4)'};">
        <i class="${isValidated ? 'fa-solid fa-check' : 'fa-solid fa-map-pin'}" style="color: white; font-size: 12px;"></i>
      </div>`,
        className: 'custom-marker checkpoint-marker',
        iconSize: [32, 32],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([cp.latitude, cp.longitude], {
        icon: checkpointIcon,
      }).addTo(this.mapInstance!).bindPopup(`
      <div style="padding: 8px; background: ${popupBg}; color: ${popupText}; border-radius: 8px;">
        <strong>${cp.name}</strong><br>
        <small style="color: ${popupSubtext};">${cp.code}</small>
        ${isValidated ? '<br><span style="color: #22c55e;">✓ Validé</span>' : ''}
      </div>
    `);

      (marker as any).checkpointId = cp.id;
      marker.on('click', () => {
        this.selectedCheckpoint.set(cp);
        this.selectedSite.set(null);
      });
      this.checkpointMarkers.push(marker);
    });
  }

  private drawTrails() {
    const isDark = document.documentElement.classList.contains('dark');
    const trailColor = isDark ? '#60a5fa' : '#3b82f6';
    const trailOpacity = isDark ? 0.8 : 0.6;

    this.liveSessions().forEach((session) => {
      const trail = this.agentTrails().get(session.agent.id) || [];

      if (trail.length > 1) {
        const points: [number, number][] = trail.map((p) => [p.lat, p.lng]);

        const trailLine = L.polyline(points, {
          color: trailColor,
          weight: 3,
          opacity: trailOpacity,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(this.mapInstance!);

        this.trailLines.set(`${session.agent.id}_trail`, trailLine);
      }
    });
  }

  private drawAgents() {
    const isDark = document.documentElement.classList.contains('dark');
    const borderColor = isDark ? '#1e293b' : 'white';

    this.liveSessions().forEach((session) => {
      const position = this.agentPositions().get(session.agent.id);
      if (!position) return;

      const agent = session.agent;
      const statusColor = agent?.status === 'working' ? '#22c55e' : '#eab308';

      const agentIcon = L.divIcon({
        html: `<div style="width: 42px; height: 42px; background: ${statusColor}; border-radius: 50%; border: 3px solid ${borderColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px ${statusColor}80;">
        <i class="fa-solid fa-user-secret" style="color: white; font-size: 18px;"></i>
      </div>`,
        className: 'custom-marker agent-marker',
        iconSize: [42, 42],
        popupAnchor: [0, -21],
      });

      const popupBg = isDark ? '#1e293b' : '#ffffff';
      const popupText = isDark ? '#e2e8f0' : '#1f2937';
      const popupSubtext = isDark ? '#94a3b8' : '#6b7280';
      const popupBorder = isDark ? '#334155' : '#e5e7eb';

      const marker = L.marker([position.lat, position.lng], {
        icon: agentIcon,
      }).addTo(this.mapInstance!).bindPopup(`
      <div style="padding: 12px; min-width: 200px; background: ${popupBg}; color: ${popupText}; border-radius: 8px; border: 1px solid ${popupBorder};">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: ${statusColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-user" style="color: white;"></i>
          </div>
          <div>
            <strong style="color: ${popupText};">${agent?.user?.fullname || 'Agent'}</strong><br>
            <small style="color: ${statusColor};">● ${agent?.status === 'working' ? 'En service' : 'Inactif'}</small>
          </div>
        </div>
        <div style="border-top: 1px solid ${popupBorder}; padding-top: 8px; color: ${popupSubtext};">
          <div style="color: ${popupText};"><i class="fa-solid fa-route"></i> ${session.totalDistanceKm?.toFixed(1) || 0} km</div>
          <div style="color: ${popupText};"><i class="fa-solid fa-flag-checkered"></i> ${session.totalCheckpointsVisited || 0} checkpoints</div>
          <div style="color: ${popupText};"><i class="fa-solid fa-building"></i> ${session.site?.name || 'Site inconnu'}</div>
        </div>
      </div>
    `);

      marker.on('click', () => this.selectedAgent.set(agent));
      this.markers.push(marker);
      this.animatedMarkers.set(session.agent.id, marker);
    });
  }

  private fitMapBounds() {
    if (!this.mapInstance) return;

    const points: [number, number][] = [];
    this.sites().forEach((s) => {
      if (s.latitude && s.longitude) points.push([s.latitude, s.longitude]);
    });
    this.checkpoints().forEach((cp) => {
      if (cp.latitude && cp.longitude) points.push([cp.latitude, cp.longitude]);
    });
    this.agentPositions().forEach((pos) => {
      points.push([pos.lat, pos.lng]);
    });

    if (points.length > 0) {
      this.mapInstance.fitBounds(L.latLngBounds(points).pad(0.2));
    } else {
      this.mapInstance.setView([5.3456, -4.0266], 12);
    }
  }

  private setupCheckpointClickHandler() {
    (window as any).handleCheckpointClick = (checkpointId: string) => {
      const checkpoint = this.checkpoints().find((cp) => cp.id === checkpointId);
      if (checkpoint && this.mapInstance) {
        this.mapInstance.setView([checkpoint.latitude, checkpoint.longitude], 16);
        this.selectedCheckpoint.set(checkpoint);
        const marker = this.checkpointMarkers.find((m) => (m as any).checkpointId === checkpointId);
        if (marker) marker.openPopup();
      }
    };
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
    setTimeout(() => this.mapInstance?.invalidateSize(), 300);
  }

  selectAgent(agent: Agent) {
    this.selectedAgent.set(agent);
    const position = this.agentPositions().get(agent.id);
    if (position && this.mapInstance) {
      this.mapInstance.setView([position.lat, position.lng], 16);
    }
  }

  selectSite(site: Site) {
    this.selectedSite.set(site);
    this.showSiteDetails.set(true);
    const siteCheckpoints = this.checkpoints()
      .filter((cp) => cp.siteId === site.id)
      .sort((a, b) => a.order - b.order);
    this.selectedSiteCheckpoints.set(siteCheckpoints);
    this.checkpointPassages.set([]);
    if (this.mapInstance) {
      this.mapInstance.setView([site.latitude, site.longitude], 16);
    }
  }

  centerOnCheckpoint(checkpoint: Checkpoint) {
    if (this.mapInstance) {
      this.mapInstance.setView([checkpoint.latitude, checkpoint.longitude], 16);
      this.selectedCheckpoint.set(checkpoint);
    }
  }

  closeSiteDetails() {
    this.showSiteDetails.set(false);
    this.selectedSite.set(null);
    this.selectedSiteCheckpoints.set([]);
    this.checkpointPassages.set([]);
  }

  clearSelectedAgent() {
    this.selectedAgent.set(null);
  }

  setView(view: 'map' | 'agents' | 'alerts' | 'sites') {
    this.selectedView.set(view);
    if (view === 'map') setTimeout(() => this.mapInstance?.invalidateSize(), 100);
  }

  setActiveTab(tab: 'overview' | 'sessions' | 'alerts' | 'sites') {
    this.activeTab.set(tab);
  }

  getAgentStatusClass(status: string): string {
    const classes: Record<string, string> = {
      working: 'bg-green-500',
      idle: 'bg-yellow-500',
    };
    return classes[status] || 'bg-gray-400';
  }

  getAgentStatusText(status: string): string {
    const texts: Record<string, string> = {
      working: 'En service',
      idle: 'Inactif',
    };
    return texts[status] || status;
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      geofence: 'fa-solid fa-location-dot',
      emergency: 'fa-solid fa-bell',
      checkpoint: 'fa-solid fa-check-circle',
      idle: 'fa-solid fa-clock',
      info: 'fa-solid fa-info-circle',
    };
    return icons[type] || 'fa-solid fa-info-circle';
  }

  getAlertColor(severity: string): string {
    const colors: Record<string, string> = {
      warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
      danger: 'bg-red-100 border-red-400 text-red-700',
      info: 'bg-blue-100 border-blue-400 text-blue-700',
      success: 'bg-green-100 border-green-400 text-green-700',
    };
    return colors[severity] || 'bg-gray-100 border-gray-400 text-gray-700';
  }

  formatTime(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`;
    return `Il y a ${Math.floor(minutes / 1440)}j`;
  }

  getSessionDuration(startTime: Date): string {
    const duration = Date.now() - new Date(startTime).getTime();
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours}h ${minutes}min`;
  }

  getSiteCheckpointsCount(siteId: string): number {
    return this.checkpoints().filter((cp) => cp.siteId === siteId).length;
  }
}
