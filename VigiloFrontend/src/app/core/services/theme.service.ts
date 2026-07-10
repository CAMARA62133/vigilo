import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Signal pour suivre l'état de manière réactive dans les composants
  isDark = signal(false);

  constructor() {
    this.loadTheme();
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme');

    // Vérifie le choix utilisateur ou la préférence du système
    if (
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      this.enableDark();
    } else {
      this.enableLight();
    }
  }

  enableDark() {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    this.isDark.set(true);
  }

  enableLight() {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    this.isDark.set(false);
  }

  toggleTheme() {
    this.isDark() ? this.enableLight() : this.enableDark();
  }
}
