import { Routes } from '@angular/router';

// ==============================
// AUTH
// ==============================

import { Login } from './features/auth/login/login';

// ==============================
// LAYOUT
// ==============================

import { Layout } from './shared/components/layout/layout';

// ==============================
// PAGES
// ==============================

import { Dashboard } from './features/dashboard/dashboard';
import { Sites } from './features/sites/sites/sites';
import { Agents } from './features/agents/agents/agents';

// ==============================
// SHARED
// ==============================

import { Unauthorized } from './shared/unauthorized/unauthorized';

// ==============================
// GUARDS
// ==============================

import { roleGuard } from './core/guards/role.guard';
import { NotFound } from './shared/not-found/not-found';
import { Chats } from './features/chats/chats';
import { Users } from './features/users/users';
import { Vitrine } from './features/site-vitrine/pages/vitrine/vitrine';
import { Plannings } from './features/plannings/plannings';

import { Surveillance } from './features/surveillance/surveillance';
import { CheckIn } from './features/check-in/check-in';
import { Profil } from './features/auth/profil/profil';
import { authGuard } from './core/guards/guard.guard';
import { Plans } from './features/plans/plans';
import { Payments } from './features/payments/payments';
import { Companies } from './features/companies/companies';
import { SiteDetails } from './features/sites/site-details/site-details';

export const routes: Routes = [
  // ============================================
  // 1. ROUTES PUBLIQUES (Avant le Layout)
  // ============================================
  {
    path: 'vitrine',
    component: Vitrine,
    title: 'Vitrine | Vigilo',
  },
  {
    path: 'login',
    component: Login,
    title: 'Connexion | Vigilo',
  },
  {
    path: 'unauthorized',
    component: Unauthorized,
    title: 'Accès refusé | Vigilo',
  },
  {
    path: '404',
    component: NotFound,
    title: 'Page introuvable',
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'vitrine',
  },
  // ============================================
  // 2. ROUTES PROTÉGÉES (SOUS LAYOUT)
  // ============================================
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      // Routes spécifiques d'abord
      {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [roleGuard],
        data: { roles: ['super_admin', 'company_admin', 'supervisor', 'agent'] },
        title: 'Tableau de bord admin | Vigilo',
      },
      {
        path: 'profil',
        component: Profil,
        canActivate: [roleGuard],
        data: {
          roles: ['super_admin', 'company_admin', 'supervisor', 'agent'],
        },
        title: 'Gestion utilisateur | Vigilo',
      },
      {
        path: 'users',
        component: Users,
        canActivate: [roleGuard],
        data: { roles: ['super_admin'] },
        title: 'Gestion utilisateurs | Vigilo',
      },

      {
        path: 'entreprises',
        component: Companies,
        canActivate: [roleGuard],
        data: { roles: ['super_admin'] },
        title: 'Gestion entreprises | Vigilo',
      },
      {
        path: 'sites',
        component: Sites,
        canActivate: [roleGuard],
        data: { roles: ['super_admin', 'company_admin'] },
        title: 'Gestion sites | Vigilo',
      },
      {
        path: 'detail-sites/:id',
        component: SiteDetails,
        canActivate: [roleGuard],
        data: { roles: ['super_admin', 'company_admin', 'agent'] },
        title: 'Détail du site | Vigilo',
      },
      {
        path: 'agents',
        component: Agents,
        canActivate: [roleGuard],
        data: { roles: ['super_admin', 'company_admin'] },
        title: 'Gestion agents | Vigilo',
      },
      {
        path: 'plannings',
        component: Plannings,
        canActivate: [roleGuard],
        data: { roles: ['super_admin', 'company_admin', 'agent'] },
        title: 'Suivi des plannings | Vigilo',
      },
      {
        path: 'check-in',
        component: CheckIn,
        title: 'Pointer | Vigilo',
      },
      {
        path: 'surveillance',
        component: Surveillance,
        title: 'Surveillance | Vigilo',
      },
      {
        path: 'abonnements',
        component: Plans,
        canActivate: [roleGuard],
        data: { roles: ['super_admin'] },
        title: 'Abonnements | Vigilo',
      },
      {
        path: 'paiements',
        component: Payments,
        canActivate: [roleGuard],
        data: { roles: ['super_admin'] },
        title: 'Paiements | Vigilo',
      },
      {
        path: 'mon-abonnement',
        component: Payments,
        canActivate: [roleGuard],
        data: { roles: ['company_admin'] },
        title: 'Mon abonnement | Vigilo',
      },
      {
        path: 'chats',
        component: Chats,
        title: 'Messagerie interne | Vigilo',
      },
      // Redirection par défaut SI connecté (à mettre à la fin des enfants)
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'profil',
      },
    ],
  },

  // ============================================
  // 3. REDIRECTIONS GLOBALES & FALLBACK
  // ============================================
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'vitrine',
  },
  {
    path: '**',
    redirectTo: '404',
  },
];
