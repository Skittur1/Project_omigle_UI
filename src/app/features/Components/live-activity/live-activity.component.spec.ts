import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveActivityComponent } from './live-activity.component';

describe('LiveActivityComponent', () => {
  let component: LiveActivityComponent;
  let fixture: ComponentFixture<LiveActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveActivityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
