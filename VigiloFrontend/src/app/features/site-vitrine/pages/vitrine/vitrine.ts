import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterModule],
  templateUrl: './vitrine.html',
  styleUrls: ['./vitrine.scss'],
})
export class Vitrine implements OnInit {
  activeSection = 'Accueil';
  mobileMenuOpen = false;

  // Données du formulaire
  formData = {
    nom: '',
    email: '',
    telephone: '',
    message: '',
  };

  menuItems = [
    { label: 'Accueil', link: '#hero', icon: 'fas fa-home' },
    { label: 'Présentation', link: '#solutions', icon: 'fas fa-info-circle' },
    { label: 'Contact', link: '#contact', icon: 'fas fa-envelope' },
  ];

  useCases = [
    {
      icon: 'fas fa-building',
      title: 'Gestion des entreprises',
      description:
        'Créez et administrez plusieurs entreprises avec leurs équipes et permissions séparées.',
    },
    {
      icon: 'fas fa-users',
      title: 'Gestion des utilisateurs',
      description:
        'Contrôlez les rôles (admin, agents, superviseurs) et les accès de chaque utilisateur.',
    },
    {
      icon: 'fas fa-map-marker-alt',
      title: 'Sites & Checkpoints',
      description: 'Définissez les zones de sécurité et les points de contrôle pour les rondes.',
    },
    {
      icon: 'fas fa-user-shield',
      title: 'Gestion des agents',
      description: 'Affectez, suivez et supervisez les agents de sécurité en temps réel.',
    },
  ];
  features = [
    {
      icon: 'fas fa-route',
      titre: 'Affectations intelligentes',
      description: 'Attribuez automatiquement ou manuellement les agents aux différents sites.',
      tag: 'Organisation',
    },
    {
      icon: 'fas fa-qrcode',
      titre: 'Scans QR Code',
      description: 'Validation des passages sur les checkpoints avec QR Code et GPS.',
      tag: 'Traçabilité',
    },
    {
      icon: 'fas fa-satellite-dish',
      titre: 'Surveillance Live',
      description: 'Suivi en temps réel des agents et activités sur une carte interactive.',
      tag: 'Temps réel',
    },
    {
      icon: 'fas fa-exclamation-triangle',
      titre: 'Gestion des incidents',
      description: 'Signalement instantané avec photos, vidéos et notifications automatiques.',
      tag: 'Sécurité',
    },
  ];

  benefits = [
    {
      icon: 'fas fa-shield-alt',
      titre: 'Sécurité centralisée',
      description:
        'Toutes les opérations de sécurité sont regroupées dans une seule plateforme intelligente.',
      color: 'indigo',
    },
    {
      icon: 'fas fa-clock',
      titre: 'Réactivité maximale',
      description: 'Les incidents et alertes sont traités immédiatement grâce au temps réel.',
      color: 'orange',
    },
    {
      icon: 'fas fa-eye',
      titre: 'Contrôle total',
      description:
        'Vous visualisez en direct les agents, les rondes et les activités sur tous les sites.',
      color: 'blue',
    },
  ];

  ngOnInit(): void {}

  scrollTo(label: string, id: string): void {
    this.activeSection = label;
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    this.closeMobileMenu();
  }

  onSubmit(): void {
    console.log('Formulaire soumis :', this.formData);
    alert('Message envoyé avec succès ! Notre équipe vous répondra dans les plus brefs délais.');
    // Réinitialisation optionnelle
    // this.formData = { nom: '', email: '', telephone: '', message: '' };
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : 'auto';
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = 'auto';
  }
}
