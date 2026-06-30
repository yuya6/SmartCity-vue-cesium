<template>
  <div
    ref="wrapRef"
    class="smart-chart bar-chart smart-panel"
    :style="wrapStyle"
  >
    <div v-if="title" class="bar-chart__title smart-title">{{ title }}</div>
    <canvas ref="canvasRef" class="bar-chart__canvas" />
  </div>
</template>

<script setup lang="ts">
/**
 * BarChart — 横向/纵向柱状图。大屏推荐横向（排名条）。
 * 支持：渐变填充、发光描边、数值标签、多系列分组（横排）。
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useResize, rafThrottle } from '../shared/hooks';
import type { BarChartItem, BarChartProps } from '../shared/types';
import {
  setupHiDPI, linearGradient, rgba, defaultColors,
} from '../shared/canvas-utils';
import { palette } from '../shared/theme';

const props = withDefaults(defineProps<BarChartProps>(), {
  data: () => [],
  direction: 'horizontal',
  width: '100%',
  height: 260,
  autoResize: true,
  animationDuration: 700,
  showLabels: true,
  yPrecision: 0,
  gradientMode: 'soft',
  size: 'md',
});

const emit = defineEmits<{
  (e: 'barClick', idx: number, item: BarChartItem): void;
}>();

const wrapRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  padding: '10px 12px 12px',
  ...(props.backgroundStyle || {}),
} as Record<string, string | number>));

const anim = {
  progress: 0, raf: 0, startTs: 0,
  from: [] as number[], to: [] as number[],
};
const bars = shallowRef<Array<{ x: number; y: number; w: number; h: number; idx: number }>>([]);

const colorsFor = () => {
  const data = props.data ?? [];
  const custom: string[] = [];
  let hasCustom = false;
  data.forEach((d) => {
    if (d.color) { custom.push(d.color); hasCustom = true; }
    else custom.push('');
  });
  if (hasCustom) return custom.map((c, i) => c || defaultColors(data.length, props.colors)[i]);
  return defaultColors(data.length, props.colors);
};

const drawValues = () => (anim.to.length ? anim.to : (props.data ?? []).map((d) => d.value || 0));
const currValues = () => {
  if (!anim.from.length || !anim.to.length) return drawValues();
  const p = anim.progress;
  return anim.to.map((t, i) => anim.from[i] + (t - anim.from[i]) * p);
};

const playAnim = (from: number[], to: number[]) => {
  cancelAnimationFrame(anim.raf);
  anim.from = from; anim.to = to; anim.startTs = 0;
  const step = (ts: number) => {
    if (!anim.startTs) anim.startTs = ts;
    const t = props.animationDuration > 0 ? Math.min(1, (ts - anim.startTs) / props.animationDuration) : 1;
    anim.progress = 1 - Math.pow(1 - t, 3);
    render(true);
    if (t < 1) anim.raf = requestAnimationFrame(step);
    else { anim.from = []; }
  };
  anim.raf = requestAnimationFrame(step);
};

const formatNumber = (v: number) => {
  if (Number.isInteger(v) && (!props.yPrecision || props.yPrecision === 0)) {
    return v.toLocaleString('zh-CN');
  }
  return v.toFixed(props.yPrecision);
};

const throttledRender = rafThrottle(() => render(false));

const render = (interpolated: boolean) => {
  const wrap = wrapRef.value; const canvas = canvasRef.value;
  if (!wrap || !canvas) return;
  const W = wrap.clientWidth - 24;
  const H = wrap.clientHeight - (props.title ? 36 : 24);
  if (W <= 0 || H <= 0) return;
  const { ctx } = setupHiDPI(canvas, W, H);
  ctx.clearRect(0, 0, W, H);

  const data = props.data ?? [];
  const rects: Array<{ x: number; y: number; w: number; h: number; idx: number }> = [];
  if (!data.length) { bars.value = rects; return; }

  const values = interpolated ? currValues() : drawValues();
  const max = Math.max(1, ...values.map(Math.abs));
  const colors = colorsFor();

  if (props.direction === 'horizontal') {
    const n = data.length;
    const rowH = H / n;
    const labelW = Math.min(W * 0.28, 110);
    const valW = 60;
    const padY = Math.max(2, rowH * 0.2);
    const barMaxW = Math.max(20, W - labelW - valW - 16);

    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, values[i]);
      const ratio = Math.min(1, v / max);
      const bh = rowH - padY * 2;
      const y = i * rowH + padY;
      const bw = barMaxW * ratio;
      const bx = labelW + 8;
      rects.push({ x: bx, y, w: bw, h: bh, idx: i });

      const c = colors[i];
      const grad = linearGradient(ctx, bx, y, bx + barMaxW, y,
        props.gradientMode === 'strong'
          ? [[0, rgba(c, 0.95)], [1, rgba('#ffffff', 0.4)]]
          : [[0, rgba(c, 0.95)], [1, rgba(c, 0.15)]]);
      ctx.fillStyle = grad;
      ctx.shadowColor = rgba(c, 0.4);
      ctx.shadowBlur = 8;
      roundRect(ctx, bx, y, Math.max(0, bw), bh, 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 标签
      ctx.fillStyle = palette.textSecondary;
      ctx.font = '12px "Inter", "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      const label = truncate(ctx, data[i].label, labelW - 4);
      ctx.fillText(label, 0, y + bh / 2);

      // 数值
      if (props.showLabels) {
        ctx.fillStyle = palette.textPrimary;
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(formatNumber(Math.max(0, values[i])), bx + bw + 8, y + bh / 2);
      }
    }
  } else {
    // vertical
    const n = data.length;
    const padB = 22; const padL = 34; const padR = 8; const padT = 10;
    const cw = W - padL - padR;
    const ch = H - padB - padT;
    const barW = Math.max(2, (cw / n) * 0.6);
    const gap = (cw / n) * 0.4;
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, values[i]);
      const ratio = Math.min(1, v / max);
      const bx = padL + i * (cw / n) + gap / 2;
      const bh = ch * ratio;
      const by = padT + ch - bh;
      rects.push({ x: bx, y: by, w: barW, h: bh, idx: i });

      const c = colors[i];
      const grad = linearGradient(ctx, bx, by, bx, by + bh,
        props.gradientMode === 'strong'
          ? [[0, rgba('#ffffff', 0.45)], [1, rgba(c, 0.95)]]
          : [[0, rgba(c, 0.95)], [1, rgba(c, 0.15)]]);
      ctx.fillStyle = grad;
      ctx.shadowColor = rgba(c, 0.4);
      ctx.shadowBlur = 8;
      roundRect(ctx, bx, by, barW, bh, 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 数值
      if (props.showLabels) {
        ctx.fillStyle = palette.textPrimary;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatNumber(Math.max(0, values[i])), bx + barW / 2, by - 4);
      }
      // 标签
      ctx.fillStyle = palette.textSecondary;
      ctx.font = '10px "Inter", "PingFang SC", sans-serif';
      ctx.textBaseline = 'top';
      const label = truncate(ctx, data[i].label, barW + gap - 2);
      ctx.fillText(label, bx + barW / 2, padT + ch + 4);
    }
  }
  bars.value = rects;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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
function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + (s.length < text.length ? '…' : '');
}

const onClick = (e: PointerEvent) => {
  const wrap = wrapRef.value; if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const x = e.clientX - rect.left - 12;
  const y = e.clientY - rect.top - (props.title ? 28 : 12);
  for (const b of bars.value) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      const item = props.data?.[b.idx];
      if (item) emit('barClick', b.idx, item);
      return;
    }
  }
};

const { width, height } = useResize(wrapRef, () => props.autoResize && throttledRender());
watch([width, height], () => throttledRender());

watch(
  () => [props.data, props.colors],
  (_n, o) => {
    const oldArr = (o?.[0] as BarChartItem[] | undefined) ?? [];
    const from = props.data?.map((_, i) => oldArr[i]?.value ?? 0) ?? [];
    const to = props.data?.map((d) => d.value ?? 0) ?? [];
    if (props.animationDuration > 0) playAnim(from, to);
    else { anim.to = to; anim.from = []; render(false); }
  },
  { deep: true },
);

defineExpose({ refresh: () => render(false) });

onMounted(() => {
  wrapRef.value?.addEventListener('pointerdown', onClick);
  playAnim((props.data ?? []).map(() => 0), (props.data ?? []).map((d) => d.value ?? 0));
});
onBeforeUnmount(() => {
  cancelAnimationFrame(anim.raf);
  wrapRef.value?.removeEventListener('pointerdown', onClick);
});
</script>

<style scoped lang="css">
.bar-chart { display: flex; flex-direction: column; overflow: hidden; }
.bar-chart__title { font-size: 0.9rem; margin-bottom: 6px; }
.bar-chart__canvas { display: block; }
</style>
