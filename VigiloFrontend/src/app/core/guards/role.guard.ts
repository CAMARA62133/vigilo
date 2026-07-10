import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['roles'] as string[];

  return toObservable(auth.isLoading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() => {
      // 1. Vérification auth
      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }

      // 2. Vérification rôle (on utilise la méthode du service)
      if (auth.hasRole(expectedRoles)) {
        return true;
      }

      // 3. Pas les droits
      return router.createUrlTree(['/unauthorized']);
    }),
  );
};
