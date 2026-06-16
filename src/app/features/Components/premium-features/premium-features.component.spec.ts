import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PremiumFeaturesComponent } from './premium-features.component';

describe('PremiumFeaturesComponent', () => {
  let component: PremiumFeaturesComponent;
  let fixture: ComponentFixture<PremiumFeaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumFeaturesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PremiumFeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
