import { Component, inject } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-premium-features',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './premium-features.component.html',
})
export class PremiumFeaturesComponent {
  protected data = inject(DataService);
}