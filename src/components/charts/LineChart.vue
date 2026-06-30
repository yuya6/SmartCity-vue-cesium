<template>
  <div
    ref="wrapRef"
    class="smart-chart line-chart smart-panel"
    :class="[`line-chart--${size}`, { 'line-chart--title': title }]"
    :style="wrapStyle"
  >
    <div v-if="title" class="line-chart__title smart-title">{{ title }}</div>
    <canvas ref="canvasRef" class="line-chart__canvas" />
    <!-- tooltip -->
    <div
      v-if="hovered"
      class="line-chart__tip"
      :style="tipStyle"
    >
      <div class="line-chart__tip-label">{{ hovered.label }}</div>
      <div
        v-for="(v, k) in hovered.values"
        :key="k"
        class="line-chart__tip-row"
      >
        <span class="swatch" :style="{ background: v.color }"></span>
        <span class="k">{{ k }}</span>
        <span class="v">{{ formatNumber(v.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * LineChart — Canvas 折线 / 面积图
 * --------------------------------------------------------
 * Props 详见 LineChartProps。
 * 特点：
 *  - 多系列、面积渐变、数据点标记
 *  - 鼠标悬停 tooltip（触控/鼠标双模式）
 *  - HiDPI 自适应 + ResizeObserver 容器变化重绘
 *  - 数据变化动画（tween）
 */
import {
  computed, onBeforeUnmount, onMounted, ref, shallowRef, watch,
} from 'vue';
import { useResize, rafThrottle } from '../shared/hooks';
import type { LineChartProps, LineChartPoint } from '../shared/types';
import {
  setupHiDPI, linearGradient, rgba, defaultColors, niceScale,
} from '../shared/canvas-utils';
import { palette } from '../shared/theme';

const props = withDefaults(defineProps<LineChartProps>(), {
  data: () => [],
  series: () => [],
  width: '100%',
  height: 200,
  autoResize: true,
  animationDuration: 700,
  area: true,
  dots: false,
  yPrecision: 0,
  size: 'md',
});

const emit = defineEmits<{
  (e: 'pointClick', idx: number, pt: LineChartPoint): void;
  (e: 'pointHover', idx: number | null, pt: LineChartPoint | null): void;
}>();

const wrapRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  padding: '10px 12px 12px',
  ...(props.backgroundStyle || {}),
} as Record<string, string | number>));

/* ---------- 数据准备 ---------- */
const normalizedSeries = computed(() => {
  if (props.series?.length) return props.series;
  // 单系列默认
  const color = (props.colors && props.colors[0]) || palette.primary;
  return [{ key: '__default__', label: props.title || 'Value', color }];
});
const seriesColorMap = computed(() => {
  const colors = defaultColors(normalizedSeries.value.length, props.colors);
  return new Map(normalizedSeries.value.map((s, i) => [s.key, s.color || colors[i]]));
});

/* ---------- 尺寸 & 绘制 ---------- */
const drawSize = { w: 0, h: 0 };
const animState = { progress: 0, raf: 0, startTs: 0, from: null as number[] | null, to: null as number[] | null };
const hovered = shallowRef<{
  label: string; x: number; y: number; values: Record<string, { value: number; color: string }>;
} | null>(null);
const tipStyle = computed(() => {
  if (!hovered.value) return {};
  const { x, y } = hovered.value;
  const left = Math.min(Math.max(8, x + 14), drawSize.w - 150);
  const top = Math.max(8, y - 10);
  return { left: `${left}px`, top: `${top}px` };
});

const rawValues = () => {
  const n = props.data?.length || 0;
  const m = normalizedSeries.value.length;
  const arr = new Array<number>(n * m);
  for (let i = 0; i < n; i++) {
    const pt = props.data![i];
    for (let j = 0; j < m; j++) {
      const s = normalizedSeries.value[j];
      let v = 0;
      if (pt?.seriesMap && s.key in pt.seriesMap) v = pt.seriesMap[s.key] as number;
      else if (j === 0 && typeof pt?.value === 'number') v = pt.value;
      arr[j * n + i] = v;
    }
  }
  return arr;
};

const playAnimation = (fromArr: number[], toArr: number[]) => {
  cancelAnimationFrame(animState.raf);
  animState.from = fromArr;
  animState.to = toArr;
  animState.startTs = 0;
  const step = (ts: number) => {
    if (!animState.startTs) animState.startTs = ts;
    const dur = props.animationDuration;
    const t = dur > 0 ? Math.min(1, (ts - animState.startTs) / dur) : 1;
    const ease = 1 - Math.pow(1 - t, 3);
    animState.progress = ease;
    render(true);
    if (t < 1) animState.raf = requestAnimationFrame(step);
    else { animState.from = null; animState.to = null; }
  };
  animState.raf = requestAnimationFrame(step);
};

const currentValues = () => {
  const base = animState.to ?? rawValues();
  if (!animState.from || !animState.to) return base;
  const p = animState.progress;
  const out = new Array<number>(base.length);
  for (let i = 0; i < base.length; i++) {
    out[i] = animState.from[i] + (animState.to[i] - animState.from[i]) * p;
  }
  return out;
};

const throttledRender = rafThrottle(() => render(false));

const render = (interpolated: boolean) => {
  const canvas = canvasRef.value;
  const wrap = wrapRef.value;
  if (!canvas || !wrap) return;
  const W = wrap.clientWidth - 24; // 减去 padding
  const H = wrap.clientHeight - (props.title ? 36 : 24);
  if (W <= 0 || H <= 0) return;
  drawSize.w = W;
  drawSize.h = H;
  const { ctx } = setupHiDPI(canvas, W, H);
  ctx.clearRect(0, 0, W, H);

  const data = props.data ?? [];
  if (!data.length) return;
  const n = data.length;
  const series = normalizedSeries.value;
  const m = series.length;

  const pad = { l: 38, r: 10, t: 10, b: 22 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  const values = interpolated ? currentValues() : rawValues();
  let vmin = Infinity, vmax = -Infinity;
  for (let i = 0; i < values.length; i++) {
    vmin = Math.min(vmin, values[i]);
    vmax = Math.max(vmax, values[i]);
  }
  const { min, max, step } = niceScale(vmin, vmax, 4);

  /* 网格 */
  ctx.save();
  ctx.strokeStyle = 'rgba(30,60,140,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = palette.textTertiary;
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const y = pad.t + (ch * i) / ticks;
    const v = max - ((max - min) * i) / ticks;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + cw, y);
    ctx.stroke();
    const txt = formatNumber(v);
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, pad.l - tw - 6, y + 4);
  }
  ctx.setLineDash([]);
  /* X 轴标签 */
  ctx.fillStyle = palette.textSecondary;
  ctx.font = '10px "Inter", sans-serif';
  const maxLabels = Math.min(6, n);
  const labelStep = Math.max(1, Math.floor(n / maxLabels));
  for (let i = 0; i < n; i += labelStep) {
    const x = pad.l + (n === 1 ? cw / 2 : (cw * i) / (n - 1));
    ctx.fillText(String(data[i].label), x - 12, pad.t + ch + 14);
  }
  ctx.restore();

  /* 折线 */
  for (let j = 0; j < m; j++) {
    const s = series[j];
    const color = seriesColorMap.value.get(s.key)!;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const v = values[j * n + i];
      const x = pad.l + (n === 1 ? cw / 2 : (cw * i) / (n - 1));
      const ratio = max === min ? 0 : 1 - (v - min) / (max - min);
      const y = pad.t + ratio * ch;
      pts.push([x, y]);
    }
    /* 面积 */
    if (props.area) {
      const last = pts[pts.length - 1];
      const first = pts[0];
      ctx.save();
      const bottom = pad.t + ch;
      const grad = linearGradient(ctx, 0, pad.t, 0, bottom, [
        [0, rgba(color, 0.45)],
        [1, rgba(color, 0.02)],
      ]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(first[0], bottom);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(last[0], bottom);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    /* 线条 */
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (s.dash) ctx.setLineDash([6, 4]);
    ctx.shadowColor = rgba(color, 0.6);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.restore();
    /* 数据点 */
    if (props.dots) {
      pts.forEach(([x, y]) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = rgba(color, 0.8);
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }
  // 安静的 unused warning：niceScale step 实际上用来供未来扩展
  void step;
};

function formatNumber(v: number) {
  if (Number.isInteger(v) && (!props.yPrecision || props.yPrecision === 0)) {
    return v.toLocaleString('zh-CN');
  }
  return v.toFixed(props.yPrecision ?? 1);
}

/* ---------- 交互 ---------- */
const pickPoint = (px: number, py: number) => {
  const data = props.data ?? [];
  if (!data.length) return null;
  const n = data.length;
  const wrap = wrapRef.value!;
  const pad = { l: 38, r: 10, t: 10, b: 22 };
  const W = wrap.clientWidth - 24;
  const H = wrap.clientHeight - (props.title ? 36 : 24);
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  // 将浏览器坐标转换为相对于 canvas 的坐标
  const rect = wrap.getBoundingClientRect();
  const x = px - rect.left - 12;
  const y = py - rect.top - (props.title ? 28 : 12);
  if (x < pad.l || x > pad.l + cw || y < pad.t || y > pad.t + ch) return null;
  const ratio = Math.max(0, Math.min(1, (x - pad.l) / (cw || 1)));
  const idx = Math.round(ratio * (n - 1));
  const series = normalizedSeries.value;
  const values = rawValues();
  const valuesByKey: Record<string, { value: number; color: string }> = {};
  for (let j = 0; j < series.length; j++) {
    const s = series[j];
    valuesByKey[s.key] = {
      value: values[j * n + idx],
      color: seriesColorMap.value.get(s.key)!,
    };
  }
  return {
    label: String(data[idx].label),
    x: x,
    y,
    values: valuesByKey,
  };
};

const onMove = (e: PointerEvent) => {
  const p = pickPoint(e.clientX, e.clientY);
  hovered.value = p;
  const idx = p ? nearestIndexFromClientX(e.clientX) : null;
  emit('pointHover', idx, idx != null ? props.data?.[idx] ?? null : null);
};
const onLeave = () => { hovered.value = null; emit('pointHover', null, null); };
const onClick = (e: PointerEvent) => {
  const idx = nearestIndexFromClientX(e.clientX);
  if (idx != null && props.data?.[idx]) emit('pointClick', idx, props.data[idx]);
};
const nearestIndexFromClientX = (clientX: number) => {
  const data = props.data ?? [];
  if (!data.length) return null;
  const n = data.length;
  const wrap = wrapRef.value!;
  const pad = { l: 38, r: 10 };
  const W = wrap.clientWidth - 24;
  const cw = W - pad.l - pad.r;
  const rect = wrap.getBoundingClientRect();
  const x = clientX - rect.left - 12;
  const ratio = Math.max(0, Math.min(1, (x - pad.l) / (cw || 1)));
  return Math.round(ratio * (n - 1));
};

/* ---------- 生命周期 ---------- */
const { width, height } = useResize(wrapRef, () => {
  if (props.autoResize) throttledRender();
});
watch([width, height], () => throttledRender());

watch(
  () => [props.data, props.series, props.colors],
  (_n, oldArr) => {
    const oldData = (oldArr?.[0] as LineChartPoint[] | undefined) ?? [];
    const from = oldData ? rawValuesFrom(oldData) : rawValues().map(() => 0);
    const to = rawValues();
    if (props.animationDuration > 0) playAnimation(from, to);
    else { animState.to = to; animState.from = null; render(false); }
  },
  { deep: true },
);

function rawValuesFrom(data: LineChartPoint[]) {
  const n = data.length;
  const m = normalizedSeries.value.length;
  const arr = new Array<number>(n * m).fill(0);
  for (let i = 0; i < n; i++) {
    const pt = data[i];
    for (let j = 0; j < m; j++) {
      const s = normalizedSeries.value[j];
      if (pt?.seriesMap && s.key in pt.seriesMap) arr[j * n + i] = pt.seriesMap[s.key] as number;
      else if (j === 0 && typeof pt?.value === 'number') arr[j * n + i] = pt.value;
    }
  }
  return arr;
}

const refresh = () => render(false);
defineExpose({ refresh });

onMounted(() => {
  const wrap = wrapRef.value;
  if (!wrap) return;
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerleave', onLeave);
  wrap.addEventListener('pointerdown', onClick);
  playAnimation(rawValues().map(() => 0), rawValues());
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animState.raf);
  const wrap = wrapRef.value;
  wrap?.removeEventListener('pointermove', onMove);
  wrap?.removeEventListener('pointerleave', onLeave);
  wrap?.removeEventListener('pointerdown', onClick);
});
</script>

<style scoped lang="css">
.line-chart {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.line-chart__title {
  font-size: 0.9rem;
  margin-bottom: 6px;
}
.line-chart__canvas { display: block; }
.line-chart__tip {
  position: absolute;
  min-width: 140px;
  background: rgba(10, 14, 39, 0.92);
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  padding: 8px 10px;
  box-shadow: 0 0 20px rgba(0,212,255,.18);
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 5;
  color: var(--text-primary);
}
.line-chart__tip-label {
  font-size: 0.8rem;
  color: var(--accent-cyan);
  letter-spacing: .06em;
  margin-bottom: 6px;
}
.line-chart__tip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.line-chart__tip-row .swatch {
  width: 10px; height: 10px; border-radius: 2px;
  box-shadow: 0 0 6px currentColor;
}
.line-chart__tip-row .k { color: var(--text-secondary); flex: 1; }
.line-chart__tip-row .v { color: var(--text-primary); font-family: 'JetBrains Mono', monospace; }
</style>
