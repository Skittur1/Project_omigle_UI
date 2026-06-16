import { Component, inject } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-stats-bar',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './stats-bar.component.html',
})
export class StatsBarComponent {
  protected data = inject(DataService);
}