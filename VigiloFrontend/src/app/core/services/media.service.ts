import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly SERVER_URL = environment.apiMediaUrl;

  getMediaUrl(
    filePath: string | null | undefined,
    type: 'photos' | 'logos' | 'documents' | 'invoices' | 'qrcodes' = 'photos',
  ): string {
    if (!filePath || filePath.toString().trim() === '') {
      return this.getPlaceholder(type);
    }

    let cleanPath = filePath.toString().replace(/\\/g, '/');

    // Si c'est déjà une URL absolue
    if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) {
      return cleanPath;
    }

    // Si le chemin contient déjà le dossier uploads
    if (cleanPath.includes('uploads/')) {
      const index = cleanPath.indexOf('uploads/');
      const finalPath = cleanPath.substring(index);
      return `${this.SERVER_URL}/${finalPath}`;
    }

    // Construction du chemin complet
    return `${this.SERVER_URL}/uploads/${type}/${cleanPath}`;
  }

  /**
   * Ouvre un document dans un nouvel onglet
   */
  openDocument(
    filePath: string | null | undefined,
    type: 'photos' | 'logos' | 'documents' | 'invoices' | 'qrcodes' = 'documents',
  ): void {
    if (!filePath) {
      console.warn('Aucun fichier à ouvrir');
      return;
    }
    const url = this.getMediaUrl(filePath, type);
    window.open(url, '_blank');
  }

  private getPlaceholder(type: string): string {
    const base = 'https://via.placeholder.com/150?text=';
    const labels: Record<string, string> = {
      photos: 'PHOTO',
      logos: 'LOGO',
      qrcodes: 'QR',
      invoices: 'FACTURE',
      documents: 'DOCUMENT',
    };
    return `${base}${labels[type] || 'FICHIER'}`;
  }
}
