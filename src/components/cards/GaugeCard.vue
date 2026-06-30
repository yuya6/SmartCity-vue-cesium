// Canvas 仪表盘/环形容量图
<template>
  <div
    class="gauge-card smart-card smart-panel"
    :style="{ width: size ? size + 'px' : '100%' }"
  >
    <div class="gauge-card__title smart-title">{{ label }}</div>
    <div class="gauge-card__body">
      <canvas ref="canvasRef" class="gauge-card__canvas" />
      <div class="gauge-card__center">
        <div class="gauge-card__value mono" :style="valueStyle">
          {{ display }}
        </div>
        <div v-if="unit" class="gauge-card__unit">{{ unit }}</div>
        <div v-if="subText" class="gauge-card__sub text-secondary">{{ subText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * GaugeCard — Canvas 仪表盘/环形容量图
 *   默认以 0~1 作为 value，使用 stops 色带从"冷到热"
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useResize, rafThrottle, easeOutCubic } from '../shared/hooks';
import type { GaugeCardProps } from '../shared/types';
import { setupHiDPI, rgba, mixColor } from '../shared/canvas-utils';

const props = withDefaults(defineProps<GaugeCardProps>(), {
  value: 0,
  stops: () => [
    [0, '#00FF88'],
    [0.55, '#FFB020'],
    [0.85, '#FF4D4F'],
    [1, '#FF4D4F'],
  ],
  animationDuration: 900,
  size: 180,
});

const canvasRef = ref<HTMLCanvasElement>();

const anim = { raf: 0, startTs: 0, from: 0, to: 0, progress: 0 };

const currentValue = computed(() => {
  if (!anim.to && anim.to !== 0) return props.value;
  return anim.from + (anim.to - anim.from) * anim.progress;
});
const display = computed(() => `${(currentValue.value * 100).toFixed(0)}%`);
const valueStyle = computed(() => {
  const c = colorAt(currentValue.value);
  return { color: c, textShadow: `0 0 12px ${rgba(c, 0.7)}` };
});

function colorAt(t: number) {
  const stops = props.stops ?? [];
  const tt = Math.max(0, Math.min(1, t));
  if (stops.length === 0) return '#00D4FF';
  if (tt <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (tt >= p0 && tt <= p1) {
      const k = p1 === p0 ? 0 : (tt - p0) / (p1 - p0);
      return mixColor(c0, c1, k);
    }
  }
  return stops[stops.length - 1][1];
}

const playAnim = () => {
  cancelAnimationFrame(anim.raf);
  anim.startTs = 0; anim.progress = 0; anim.from = currentValue.value; anim.to = props.value;
  const step = (ts: number) => {
    if (!anim.startTs) anim.startTs = ts;
    const t = props.animationDuration > 0 ? Math.min(1, (ts - anim.startTs) / props.animationDuration) : 1;
    anim.progress = easeOutCubic(t);
    render();
    if (t < 1) anim.raf = requestAnimationFrame(step);
  };
  anim.raf = requestAnimationFrame(step);
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const W = canvas.clientWidth || 180;
  const H = canvas.clientHeight || 180;
  const { ctx } = setupHiDPI(canvas, W, H);
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) / 2 - 10;
  const trackWidth = 14;
  const start = Math.PI * 0.8;
  const end = Math.PI * 2.2; // 252° 弧
  const full = end - start;

  // 轨道
  ctx.save();
  ctx.lineWidth = trackWidth;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,60,140,0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.stroke();
  ctx.restore();

  // 分段刻度色带 + 发光
  const v = Math.max(0, Math.min(1, currentValue.value));
  if (v > 0) {
    const segs = 64;
    for (let i = 0; i < segs; i++) {
      const a0 = start + (v * full * i) / segs;
      const a1 = start + (v * full * (i + 1)) / segs;
      const t = (i + 0.5) / segs;
      const c = colorAt(t * v);
      ctx.save();
      ctx.lineWidth = trackWidth;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = c;
      ctx.shadowColor = rgba(c, 0.5);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.stroke();
      ctx.restore();
    }
    // 端点发光小圆
    const ang = start + v * full;
    const ex = cx + Math.cos(ang) * r;
    const ey = cy + Math.sin(ang) * r;
    ctx.save();
    ctx.fillStyle = colorAt(v);
    ctx.shadowColor = rgba(colorAt(v), 0.8);
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ex, ey, trackWidth * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const wrapRef = computed(() => canvasRef.value?.parentElement);
const onResize = () => render();
const throttled = rafThrottle(onResize);
const { width, height } = useResize(wrapRef, () => throttled());
watch([width, height], () => throttled());

watch(
  () => props.value,
  () => playAnim(),
);
watch(() => props.stops, () => render(), { deep: true });

defineExpose({ refresh: () => render() });

onMounted(() => playAnim());
onBeforeUnmount(() => cancelAnimationFrame(anim.raf));
</script>

<style scoped lang="css">
.gauge-card {
  display: inline-flex;
  flex-direction: column;
  padding: 10px 12px 14px;
}
.gauge-card__title {
  font-size: 0.85rem;
  margin-bottom: 4px;
}
.gauge-card__body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
}
.gauge-card__canvas {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 160px;
}
.gauge-card__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  gap: 2px;
}
.gauge-card__value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: .02em;
}
.gauge-card__unit {
  font-size: 0.7rem;
  color: var(--text-secondary);
  letter-spacing: .1em;
}
.gauge-card__sub {
  font-size: 0.7rem;
  letter-spacing: .1em;
  margin-top: 4px;
}
</style>
