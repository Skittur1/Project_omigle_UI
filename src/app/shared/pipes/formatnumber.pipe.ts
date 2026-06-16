import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatNumber', standalone: true })
export class FormatNumberPipe implements PipeTransform {
  transform(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return value.toLocaleString();
    return String(value);
  }
}
