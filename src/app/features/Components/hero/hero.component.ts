import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { GlobeVisualizationComponent } from '../globe-visualization/globe-visualization.component';
import { LiveActivityComponent } from '../live-activity/live-activity.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [
    CommonModule,
    GlobeVisualizationComponent,
    LiveActivityComponent
  ],
  templateUrl: './hero.component.html'
})
export class HeroComponent {
  protected data = inject(DataService);
}