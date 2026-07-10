import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

 interface ApiError {
  status: number;
  message: string;
  validationErrors?: { [key: string]: string } | Array<{ param: string; msg: string }>;
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
): Observable<HttpEvent<any>> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1️⃣ Reset du timer d'inactivité à chaque requête SAUF pour le login/logout
  if (!req.url.includes('/login') && !req.url.includes('/logout')) {
    auth.resetInactivityTimer();
  }

  // 2️⃣ Ajout de withCredentials pour les cookies (Session HttpOnly)
  const request = req.clone({ withCredentials: true });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // 🔥 SESSION EXPIRÉE (401)
      if (error.status === 401) {
        // On ne redirige que si on n'est pas déjà sur la page login
        // et si l'utilisateur était considéré comme connecté
        if (!router.url.includes('/login')) {
          auth.clearAuthState();
          router.navigate(['/login']);
        }
      }

      // Formatage de l'objet ApiError
      let apiError: ApiError = {
        status: error.status,
        message: error.error?.message || 'Une erreur est survenue',
      };

      // 🔹 GESTION DES ERREURS DE VALIDATION (Express-Validator / Joi)
      if (error.status === 400 && error.error?.validationErrors) {
        const ve = error.error.validationErrors;
        if (Array.isArray(ve)) {
          const obj: { [key: string]: string } = {};
          ve.forEach((e: any) => {
            const field = e.param || e.path; // Supporte différents formats de librairies
            obj[field] = String(e.msg);
          });
          apiError.validationErrors = obj;
        } else {
          apiError.validationErrors = ve;
        }
      } else {
        // 🔹 TRADUCTION DES CODES HTTP STANDARDS
        switch (error.status) {
          case 0:
            apiError.message = 'Serveur injoignable (Vérifiez votre connexion)';
            break;
          case 403:
            apiError.message = 'Vous n’avez pas les droits nécessaires';
            break;
          case 404:
            // Pour le login, on personnalise, sinon message générique
            apiError.message = req.url.includes('/login')
              ? 'Identifiants incorrects'
              : 'Ressource introuvable';
            break;
          case 500:
            apiError.message = 'Erreur serveur (500)';
            break;
        }
      }

      return throwError(() => apiError);
    }),
  );
};
