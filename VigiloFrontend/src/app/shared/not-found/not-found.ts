import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [],
  templateUrl: './not-found.html',
})
export class NotFound {
  private router = inject(Router);
  private location = inject(Location);

  goHome() {
    this.router.navigate(['/dashboard']);
  }

  goBack() {
    this.location.back();
  }
}
