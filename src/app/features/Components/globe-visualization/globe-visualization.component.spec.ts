import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobeVisualizationComponent } from './globe-visualization.component';

describe('GlobeVisualizationComponent', () => {
  let component: GlobeVisualizationComponent;
  let fixture: ComponentFixture<GlobeVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobeVisualizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobeVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
