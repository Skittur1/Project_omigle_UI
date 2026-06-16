import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-globe-visualization',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './globe-visualization.component.html'
})
export class GlobeVisualizationComponent {
  protected data = inject(DataService);
}