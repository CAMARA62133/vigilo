import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { SocketService } from './core/services/socket.service';
import { Toasts } from './shared/components/toast/toasts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,Toasts],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  ngOnInit(): void {
    this.auth.checkAuth();

    const user = this.auth.user();

    if (user) {
      this.socket.connect(user.id, user.role, user.companyId!);
    }
  }
}
