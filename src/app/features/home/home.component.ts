import { Component } from '@angular/core';
import { TestimonialsComponent } from '../Components/testimonials/testimonials.component';
import { CtaBannerComponent } from '../Components/cta-banner/cta-banner.component';
import { GlobeVisualizationComponent } from '../Components/globe-visualization/globe-visualization.component';
import { PremiumFeaturesComponent } from '../Components/premium-features/premium-features.component';
import { HeroComponent } from '../Components/hero/hero.component';
import { HowItWorksComponent } from '../Components/how-it-works/how-it-works.component';
import { StatsBarComponent } from '../../shared/components/stats-bar/stats-bar.component';

@Component({
  selector: 'app-home',
  imports: [TestimonialsComponent,PremiumFeaturesComponent,CtaBannerComponent,GlobeVisualizationComponent,HeroComponent,HowItWorksComponent,StatsBarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {

}
