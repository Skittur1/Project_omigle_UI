import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-cta-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cta-banner.component.html'
})
export class CtaBannerComponent {
  protected data = inject(DataService);
}