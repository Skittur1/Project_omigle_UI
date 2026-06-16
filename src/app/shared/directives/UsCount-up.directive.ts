import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

@Directive({
  selector: '[appIntersection]',
  standalone: true
})
export class IntersectionDirective implements OnInit {

  @Input() threshold = 0.2;

  @Output() visible =
    new EventEmitter<boolean>();

  constructor(
    private element: ElementRef
  ) {}

  ngOnInit(): void {

    const observer =
      new IntersectionObserver(
        ([entry]) => {

          if (entry.isIntersecting) {

            this.visible.emit(true);

            observer.disconnect();
          }

        },
        {
          threshold: this.threshold
        }
      );

    observer.observe(
      this.element.nativeElement
    );
  }
}