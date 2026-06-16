import {
  Directive, ElementRef, Input, OnInit, OnDestroy,
} from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnInit, OnDestroy {
  @Input('appCountUp') target = 0;
  @Input() duration = 2000;

  private observer!: IntersectionObserver;
  private rafId: number | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.startCount();
          this.observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  private startCount(): void {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / this.duration, 1);
      this.el.nativeElement.textContent = Math.floor(progress * this.target).toLocaleString();
      if (progress < 1) {
        this.rafId = requestAnimationFrame(step);
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
