import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { FormatNumberPipe} from '../../../shared/pipes/formatnumber.pipe'

@Component({
  selector: 'app-live-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-activity.component.html',
  styleUrl: './live-activity.component.css'
})
export class LiveActivityComponent {
  protected data = inject(DataService);
}