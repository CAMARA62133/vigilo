import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { CommonModule } from '@angular/common';

import { SocketService } from '../../core/services/socket.service';
import { WorkSessionService } from '../../core/services/work-session.service';
import { Site } from '../../core/models/Site.model';
import { WorkSession } from '../../core/models/Work-session.model';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [ZXingScannerModule, CommonModule],
  templateUrl: './check-in.html',
  styleUrls: ['./check-in.scss'],
})
export class CheckIn implements OnInit, OnDestroy {
  private workSessionService = inject(WorkSessionService);
  private socketService = inject(SocketService);

  // UI
  isLoading = signal(false);
  showSuccess = signal(false);
  errorMessage = signal<string | null>(null);

  // Scanner
  showScannerModal = signal(false);
  scannerEnabled = signal(false);

  // Backend state (DYNAMIQUE)
  session = signal<WorkSession | null>(null);
  siteInfo = signal<Site | null>(null);

  // GPS
  currentPosition = signal<GeolocationPosition | null>(null);
  gpsEnabled = signal(false);

  // Camera
  cameraEnabled = signal(false);
  private mediaStream: MediaStream | null = null;

  // Network
  internetActive = signal(navigator.onLine);

  // QR formats
  formats = [BarcodeFormat.QR_CODE];

  // Watcher
  private watchId?: number;

  // Propriétés supplémentaires pour l'UI
  lastActivities = signal<any[]>([]);
  scannedSitesCount = signal<number>(0);
  sessionDuration = signal<string>('00:00');
  sessionStartTime = signal<Date>(new Date());
  private sessionInterval: any;


  ngOnInit(): void {
    this.listenSockets();
    this.checkGpsPermission();
    this.checkCameraPermission();


    window.addEventListener('online', () => this.internetActive.set(true));
    window.addEventListener('offline', () => this.internetActive.set(false));
  }

  ngOnDestroy(): void {
    this.stopAll();
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
    }
  }

  // ========================
  // CLEAN STOP
  // ========================
  private stopAll(): void {
    this.stopCamera();
    this.stopGps();
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.scannerEnabled.set(false);
    this.showScannerModal.set(false);
  }

  private stopGps(): void {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  closeScannerModal(): void {
    this.stopCamera();
  }

  // ========================
  // GPS HELPERS
  // ========================
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('GPS not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  private async checkGpsPermission(): Promise<void> {
    try {
      await this.getCurrentPosition();
      this.gpsEnabled.set(true);
    } catch {
      this.gpsEnabled.set(false);
    }
  }

  private async checkCameraPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      stream.getTracks().forEach((t) => t.stop());
      this.cameraEnabled.set(true);
    } catch {
      this.cameraEnabled.set(false);
    }
  }

  // ========================
  // SCANNER
  // ========================
  async openScannerModal(): Promise<void> {
    this.errorMessage.set(null);

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      this.cameraEnabled.set(true);
      this.showScannerModal.set(true);
      this.scannerEnabled.set(true);
    } catch {
      this.cameraEnabled.set(false);
      this.errorMessage.set('Impossible d’accéder à la caméra');
    }
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.selectedDevice =
      devices.find(
        (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'),
      ) ||
      devices[0] ||
      null;
  }

  selectedDevice: MediaDeviceInfo | null = null;

  // ========================
  // CHECK-IN (DYNAMIQUE)
  // ========================
  async onScanSuccess(qrData: string): Promise<void> {
    this.closeScannerModal();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const position = await this.getCurrentPosition();
      this.currentPosition.set(position);

      this.workSessionService
        .checkIn({
          qrData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        .subscribe({
          next: (res) => {
            this.isLoading.set(false);
            this.showSuccess.set(true);

            // 🔥 DYNAMIQUE BACKEND ONLY
            this.session.set(res.data.session);
            this.siteInfo.set(res.data.planning.site!);

            // Initialiser le temps de début de session
            this.sessionStartTime.set(new Date());

            // Démarrer le compteur de durée
            this.startSessionTimer();

            // Incrémenter le compteur de sites scannés
            this.scannedSitesCount.update((count) => count + 1);

            // start tracking after success
            this.startGpsTracking();

            setTimeout(() => this.showSuccess.set(false), 2500);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.errorMessage.set(err?.error?.message || 'Erreur check-in');

            setTimeout(() => this.errorMessage.set(null), 3000);
          },
        });
    } catch {
      this.isLoading.set(false);
      this.errorMessage.set('GPS obligatoire pour le check-in');

      setTimeout(() => this.errorMessage.set(null), 3000);
    }
  }

  // ========================
  // SESSION TIMER
  // ========================
  private startSessionTimer(): void {
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
    }

    this.sessionInterval = setInterval(() => {
      if (this.sessionActive()) {
        const start = this.sessionStartTime();
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (hours > 0) {
          this.sessionDuration.set(`${hours}h ${minutes.toString().padStart(2, '0')}m`);
        } else {
          this.sessionDuration.set(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          );
        }
      }
    }, 1000);
  }

  // ========================
  // GPS TRACKING LIVE
  // ========================
  private startGpsTracking(): void {
    this.stopGps();

    this.watchId = navigator.geolocation.watchPosition((pos) => {
      this.currentPosition.set(pos);

      if (!this.sessionActive()) return;

      const payload = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed || 0,
      };

      // WebSocket realtime
      this.socketService.sendGpsUpdate(payload);

      // HTTP persistence
      this.workSessionService.sendPosition(payload).subscribe();
    });
  }

  // ========================
  // SOCKET LISTENER
  // ========================
  private listenSockets(): void {
    effect(() => {
      const gps = this.socketService.lastGpsUpdate();
      if (gps) console.log('GPS LIVE:', gps);
    });

    effect(() => {
      const notif = this.socketService.lastNotification();
      if (notif) console.log('NOTIF:', notif);
    });
  }

  // ========================
  // HELPERS
  // ========================
  sessionActive(): boolean {
    return this.session()?.status === 'active';
  }

  getAccuracy(): number | null {
    return this.currentPosition()?.coords?.accuracy ?? null;
  }

  getLatitude(): number | null {
    return this.currentPosition()?.coords?.latitude ?? null;
  }

  getLongitude(): number | null {
    return this.currentPosition()?.coords?.longitude ?? null;
  }

  getAccuracyBar(): number {
    const acc = this.getAccuracy();
    if (!acc) return 0;
    // Inverser la logique : plus la précision est bonne (petit chiffre), plus la barre est grande
    if (acc <= 10) return 100;
    if (acc <= 20) return 80;
    if (acc <= 30) return 60;
    if (acc <= 50) return 40;
    if (acc <= 100) return 20;
    return 10;
  }

  refreshLocation(): void {
    this.getCurrentPosition()
      .then((position) => {
        this.currentPosition.set(position);
        this.errorMessage.set(null);
      })
      .catch(() => {
        this.errorMessage.set('Impossible de rafraîchir la position');
        setTimeout(() => this.errorMessage.set(null), 3000);
      });
  }

  clearError(): void {
    this.errorMessage.set(null);
  }


}
