import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [],
  templateUrl: './unauthorized.html',
})
export class Unauthorized {
  private router = inject(Router);
  private authService = inject(AuthService);

  goBack() {
    // Redirige vers le dashboard ou la racine
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.logout();
  }
}
