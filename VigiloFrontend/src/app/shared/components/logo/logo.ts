import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [ngStyle]="{ width: size, height: size }"
      class="flex flex-col items-center justify-center transition-transform duration-300"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(10, 0) scale(0.8)">
          <path
            d="M50 5 L10 25 V65 C10 85, 50 95, 50 95 C50 95, 90 85, 90 65 V25 L50 5Z"
            fill="#f97316"
          />
          <path
            d="M50 5 L10 25 V65 C10 85, 50 95, 50 95 C50 95, 90 85, 90 65 V25 L50 5Z"
            stroke="#1e3a8a"
            stroke-width="20"
            stroke-linejoin="round"
          />
          <path
            d="M50 30 L35 38 V55 C35 65, 50 70, 50 70 C50 70, 65 65, 65 55 V38 L50 30Z"
            stroke-width="10"
            stroke="#e2e8f0"
            stroke-linejoin="round"
          />
        </g>

        <text
          x="50%"
          y="100"
          text-anchor="middle"
          font-family="system-ui, -apple-system, sans-serif"
          font-weight="950"
          font-size="22"
          letter-spacing="-1"
        >
          <tspan fill="#1e3a8a">VIG</tspan>
          <tspan fill="#f97316">ILO</tspan>
        </text>
      </svg>
    </div>
  `,
})
export class LogoComponent {
  @Input() size: string = '150px';
}
