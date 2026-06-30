<template>
  <div
    ref="wrapRef"
    class="smart-chart heatmap smart-panel"
    :style="wrapStyle"
  >
    <div v-if="title" class="heatmap__title smart-title">{{ title }}</div>
    <div class="heatmap__wrap">
      <canvas ref="canvasRef" class="heatmap__canvas" @pointermove="onMove" @pointerleave="onLeave" @pointerdown="onClick" />
      <!-- tooltip -->
      <div v-if="tip" class="heatmap__tip" :style="tipStyle">
        <div class="heatmap__tip-row"><span>{{ tip.row }}</span> / <span>{{ tip.col }}</span></div>
        <div class="heatmap__tip-val">{{ valueFormatter(tip.value) }}</div>
      </div>
    </div>
    <div class="heatmap__legend">
      <span class="heatmap__legend-low">{{ minLabel }}</span>
      <div class="heatmap__legend-bar" :style="legendStyle" />
      <span class="heatmap__legend-high">{{ maxLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Heatmap — 2D 网格热力图。行/列展示二维密度，适合：
 *   - 24 小时 × 7 星期 客流量
 *   - 11 区县 × 指标项 密度
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useResize, rafThrottle } from '../shared/hooks';
import type { HeatmapCell, HeatmapProps } from '../shared/types';
import { setupHiDPI, mixColor } from '../shared/canvas-utils';
import { palette } from '../shared/theme';

const props = withDefaults(defineProps<HeatmapProps>(), {
  data: () => [],
  width: '100%',
  height: 240,
  autoResize: true,
  animationDuration: 600,
  title: '',
  cellRadius: 2,
  tooltip: true,
  size: 'md',
});

const emit = defineEmits<{
  (e: 'cellClick', cell: HeatmapCell): void;
  (e: 'cellHover', cell: HeatmapCell | null): void;
}>();

const wrapRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  padding: '10px 12px 12px',
  ...(props.backgroundStyle || {}),
} as Record<string, string | number>));

const _defaultStops: Array<[number, string]> = [
  [0.0, '#0B1540'],
  [0.3, '#12457B'],
  [0.6, '#00A0DD'],
  [0.85, '#45FFD0'],
  [1.0, '#FFFFFF'],
];
const stops = computed<Array<[number, string]>>(() => props.colorStops?.length ? props.colorStops : _defaultStops);

const rows_ = computed(() => {
  if (props.rows?.length) return props.rows;
  const set = new Set<string>();
  props.data?.forEach((c) => set.add(c.row));
  return Array.from(set);
});
const cols_ = computed(() => {
  if (props.cols?.length) return props.cols;
  const set = new Set<string>();
  props.data?.forEach((c) => set.add(c.col));
  return Array.from(set);
});

const vmin = computed(() => props.data?.reduce((m, c) => Math.min(m, c.value), Infinity) ?? 0);
const vmax = computed(() => props.data?.reduce((m, c) => Math.max(m, c.value), -Infinity) ?? 0);
const minLabel = computed(() => fmt(Number.isFinite(vmin.value) ? vmin.value : 0));
const maxLabel = computed(() => fmt(Number.isFinite(vmax.value) ? vmax.value : 0));

const legendStyle = computed(() => {
  const stopsCSS = stops.value
    .map(([p, c]) => `${c} ${(p * 100).toFixed(1)}%`)
    .join(', ');
  return { background: `linear-gradient(90deg, ${stopsCSS})` };
});

function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
function valueFormatter(v: number) { return fmt(v); }

const anim = { progress: 0, raf: 0, startTs: 0, from: new Map<string, number>(), to: new Map<string, number>() };
const throttledRender = rafThrottle(() => render());

function cellKey(r: string, c: string) { return `${r}\u0001${c}`; }

function colorFor(value: number): string {
  const min = Number.isFinite(vmin.value) ? vmin.value : 0;
  const max = Number.isFinite(vmax.value) ? vmax.value : 0;
  if (max === min) return stops.value[0][1];
  const t = (value - min) / (max - min);
  const stopsArr = stops.value;
  for (let i = 0; i < stopsArr.length - 1; i++) {
    const [p0, c0] = stopsArr[i];
    const [p1, c1] = stopsArr[i + 1];
    if (t >= p0 && t <= p1) {
      const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
      return mixColor(c0, c1, k);
    }
  }
  return t < stopsArr[0][0] ? stopsArr[0][1] : stopsArr[stopsArr.length - 1][1];
}

const cellsRef = shallowRef<Array<{ row: string; col: string; value: number; x: number; y: number; w: number; h: number }>>([]);
const tip = shallowRef<{ row: string; col: string; value: number; x: number; y: number } | null>(null);
const tipStyle = computed(() => {
  if (!tip.value) return {};
  const { x, y } = tip.value;
  return { left: `${x + 10}px`, top: `${y - 38}px` };
});

const playAnim = () => {
  cancelAnimationFrame(anim.raf);
  anim.startTs = 0; anim.progress = 0;
  const to = new Map<string, number>();
  const from = new Map<string, number>(anim.to); // 用上次终点做起点
  (props.data ?? []).forEach((c) => to.set(cellKey(c.row, c.col), c.value));
  anim.from = from; anim.to = to;
  const step = (ts: number) => {
    if (!anim.startTs) anim.startTs = ts;
    const t = props.animationDuration > 0 ? Math.min(1, (ts - anim.startTs) / props.animationDuration) : 1;
    anim.progress = 1 - Math.pow(1 - t, 3);
    render();
    if (t < 1) anim.raf = requestAnimationFrame(step);
  };
  anim.raf = requestAnimationFrame(step);
};

const valueAt = (r: string, c: string) => {
  const key = cellKey(r, c);
  const t = anim.progress;
  const from = anim.from.get(key) ?? 0;
  const to = anim.to.get(key) ?? 0;
  return from + (to - from) * t;
};

const render = () => {
  const wrap = wrapRef.value; const canvas = canvasRef.value;
  if (!wrap || !canvas) return;
  const body = wrap.querySelector<HTMLElement>('.heatmap__wrap');
  if (!body) return;
  const W = body.clientWidth, H = body.clientHeight;
  if (W <= 0 || H <= 0) return;
  const { ctx } = setupHiDPI(canvas, W, H);
  ctx.clearRect(0, 0, W, H);
  const rows = rows_.value; const cols = cols_.value;
  if (!rows.length || !cols.length) return;

  const leftPad = 72, topPad = 18, rightPad = 8, bottomPad = 4;
  const cw = (W - leftPad - rightPad) / cols.length;
  const ch = (H - topPad - bottomPad) / rows.length;
  const cellW = cw * 0.82, cellH = ch * 0.78;
  const cells: typeof cellsRef.value = [];

  // 列标签
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillStyle = palette.textSecondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  cols.forEach((c, i) => {
    const x = leftPad + i * cw + cw / 2;
    ctx.fillText(c, x, topPad / 2 + 2);
  });
  // 行标签
  ctx.textAlign = 'right';
  rows.forEach((r, i) => {
    const y = topPad + i * ch + ch / 2;
    ctx.fillText(r, leftPad - 6, y);
  });

  const r_ = props.cellRadius ?? 2;
  rows.forEach((r, ri) => {
    cols.forEach((c, ci) => {
      const v = valueAt(r, c);
      const color = colorFor(v);
      const x = leftPad + ci * cw + (cw - cellW) / 2;
      const y = topPad + ri * ch + (ch - cellH) / 2;
      cells.push({ row: r, col: c, value: anim.to.get(cellKey(r, c)) ?? 0, x, y, w: cellW, h: cellH });
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      roundRect(ctx, x, y, cellW, cellH, r_);
      ctx.fill();
      ctx.restore();
    });
  });
  cellsRef.value = cells;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

const localToCell = (e: PointerEvent) => {
  const canvas = canvasRef.value; if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  for (const c of cellsRef.value) {
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      return { cell: c, x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }
  return null;
};
const onMove = (e: PointerEvent) => {
  if (!props.tooltip) return;
  const hit = localToCell(e);
  if (!hit) { tip.value = null; emit('cellHover', null); return; }
  tip.value = { row: hit.cell.row, col: hit.cell.col, value: hit.cell.value, x: hit.x, y: hit.y };
  emit('cellHover', hit.cell);
};
const onLeave = () => { tip.value = null; emit('cellHover', null); };
const onClick = (e: PointerEvent) => {
  const hit = localToCell(e);
  if (hit) emit('cellClick', hit.cell);
};

const { width, height } = useResize(wrapRef, () => props.autoResize && throttledRender());
watch([width, height], () => throttledRender());

watch(
  () => [props.data, props.rows, props.cols, props.colorStops],
  () => playAnim(),
  { deep: true },
);

defineExpose({ refresh: () => render() });

onMounted(() => playAnim());
onBeforeUnmount(() => cancelAnimationFrame(anim.raf));
</script>

<style scoped lang="css">
.heatmap { display: flex; flex-direction: column; overflow: hidden; }
.heatmap__title { font-size: 0.9rem; margin-bottom: 4px; }
.heatmap__wrap { position: relative; flex: 1; min-height: 0; }
.heatmap__canvas { display: block; width: 100%; height: 100%; }
.heatmap__tip {
  position: absolute;
  padding: 4px 8px;
  background: rgba(10,14,39,.95);
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  font-size: 0.72rem;
  pointer-events: none;
  white-space: nowrap;
  z-index: 5;
}
.heatmap__tip-row { color: var(--text-secondary); }
.heatmap__tip-val { color: var(--accent-cyan); font-family: 'JetBrains Mono', monospace; }

.heatmap__legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.7rem;
  color: var(--text-tertiary);
}
.heatmap__legend-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
}
</style>
