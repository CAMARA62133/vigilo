import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Si on n'est pas en train de charger et qu'on est déjà connecté, on passe direct
  if (!auth.isLoading() && auth.isAuthenticated()) {
    return true;
  }

  return toObservable(auth.isLoading).pipe(
    filter((loading) => !loading), 
    take(1),
    map(() => {
      if (auth.isAuthenticated()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
