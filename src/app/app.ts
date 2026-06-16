import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { HomeComponent } from './features/home/home.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,MainLayoutComponent,HomeComponent,FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'Project_omigle_UI';
}
