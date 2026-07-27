import { Component, ElementRef, Input, OnChanges, computed, signal, viewChild } from '@angular/core';
import { ProgressMeasurement } from '../../../core/models/customer.model';
import { formatDateShort } from '../../status-utils';

interface ChartPoint {
  x: number;
  y: number;
  date: string;
  weight: number;
}

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 220;
const MARGIN = { top: 28, right: 12, bottom: 28, left: 34 };

@Component({
  selector: 'app-weight-chart',
  standalone: true,
  templateUrl: './weight-chart.component.html',
  styleUrl: './weight-chart.component.scss'
})
export class WeightChartComponent implements OnChanges {
  @Input({ required: true }) measurements!: ProgressMeasurement[];

  svgEl = viewChild<ElementRef<SVGSVGElement>>('svg');

  viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  formatDateShort = formatDateShort;

  private data = signal<ProgressMeasurement[]>([]);
  hoveredIndex = signal<number | null>(null);

  plotLeft = MARGIN.left;
  plotRight = VIEW_WIDTH - MARGIN.right;
  plotTop = MARGIN.top;
  plotBottom = VIEW_HEIGHT - MARGIN.bottom;

  yScale = computed(() => {
    const weights = this.data().map(m => m.weight);
    const rawMin = Math.min(...weights);
    const rawMax = Math.max(...weights);
    const range = rawMax - rawMin || 2;
    const pad = Math.max(1, range * 0.25);
    const min = Math.floor((rawMin - pad) * 2) / 2;
    const max = Math.ceil((rawMax + pad) * 2) / 2;
    return { min, max: max === min ? min + 1 : max };
  });

  yTicks = computed(() => {
    const { min, max } = this.yScale();
    const stepCount = 4;
    const step = (max - min) / stepCount;
    return Array.from({ length: stepCount + 1 }, (_, i) => Math.round((min + step * i) * 10) / 10);
  });

  yForTick(tick: number): number {
    const { min, max } = this.yScale();
    const plotHeight = this.plotBottom - this.plotTop;
    return this.plotBottom - ((tick - min) / (max - min)) * plotHeight;
  }

  points = computed<ChartPoint[]>(() => {
    const list = this.data();
    const { min, max } = this.yScale();
    const plotWidth = this.plotRight - this.plotLeft;
    const plotHeight = this.plotBottom - this.plotTop;
    return list.map((m, i) => {
      const x = list.length === 1
        ? this.plotLeft + plotWidth / 2
        : this.plotLeft + (i / (list.length - 1)) * plotWidth;
      const y = this.plotTop + plotHeight - ((m.weight - min) / (max - min)) * plotHeight;
      return { x, y, date: m.date, weight: m.weight };
    });
  });

  linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  });

  areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `M${first.x},${this.plotBottom} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${last.x},${this.plotBottom} Z`;
  });

  /** A sparse subset of point indices to label on the x-axis, so dates never crowd. */
  xLabelIndices = computed(() => {
    const n = this.data().length;
    if (n <= 5) return Array.from({ length: n }, (_, i) => i);
    const wanted = [0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round((3 * (n - 1)) / 4), n - 1];
    return Array.from(new Set(wanted)).sort((a, b) => a - b);
  });

  lastPoint = computed(() => {
    const pts = this.points();
    return pts.length ? pts[pts.length - 1] : null;
  });

  hovered = computed(() => {
    const i = this.hoveredIndex();
    return i === null ? null : this.points()[i] ?? null;
  });

  tooltipStyle = computed(() => {
    const p = this.hovered();
    if (!p) return {};
    const leftPercent = (p.x / VIEW_WIDTH) * 100;
    const flip = leftPercent > 70;
    return {
      left: `${leftPercent}%`,
      transform: flip ? 'translate(-100%, -100%)' : 'translate(0, -100%)',
      marginLeft: flip ? '-8px' : '8px'
    };
  });

  ngOnChanges() {
    this.data.set(this.measurements ?? []);
    this.hoveredIndex.set(null);
  }

  onPointerMove(event: PointerEvent) {
    const svg = this.svgEl()?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const xUser = ratio * VIEW_WIDTH;

    const pts = this.points();
    if (pts.length === 0) return;
    let nearest = 0;
    let nearestDist = Infinity;
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - xUser);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    this.hoveredIndex.set(nearest);
  }

  onPointerLeave() {
    this.hoveredIndex.set(null);
  }
}
