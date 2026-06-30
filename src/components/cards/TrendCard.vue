// 迷你卡片：KPI 数值 + 迷你趋势线（Sparkline）
<template>
  <div
    class="trend-card smart-card smart-panel"
    :class="[`trend-card--${accent}`]"
    :style="customStyle"
    @click="$emit('click', $event)"
  >
    <div class="trend-card__head">
      <span class="trend-card__label">{{ label }}</span>
      <component :is="accentIcon" size="16" />
    </div>
    <div class="trend-card__body">
      <div class="trend-card__kpi">
        <span class="trend-card__value mono tabular">{{ display }}</span>
        <span v-if="unit" class="trend-card__unit">{{ unit }}</span>
      </div>
      <div class="trend-card__change" :class="changeClass">
        <component :is="changeIcon" size="13" />
        <span class="mono">{{ changeText }}</span>
      </div>
    </div>
    <canvas ref="canvasRef" class="trend-card__spark" />
  </div>
</template>

<script setup lang="ts">
/**
 * TrendCard — 迷你卡片：KPI 数值 + 迷你趋势线（Sparkline）
 *   Props:
 *    - label: string
 *    - value: number | string
 *    - unit?: string
 *    - spark: number[]     最近 N 个点（用于绘制迷你折线）
 *    - delta?: number      与上周期差值（>0 升 / <0 降）
 *    - deltaText?: string  覆盖差值文案（如 "+12.3%"）
 *    - accent: SemanticStatus | 'primary'
 *    - color?: string      自定义色
 *    - animateNumber?: boolean
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useResize, rafThrottle, useAnimatedNumber, fmt } from '../shared/hooks';
import type { SemanticStatus } from '../shared/types';
import { setupHiDPI, linearGradient, rgba } from '../shared/canvas-utils';
import {
  IconActivity, IconChart, IconSignal, IconUsers, IconCar, IconLeaf, IconCpu, IconWifi, IconArrowUp, IconArrowDown, IconMinus,
} from '../ui/icons';

const props = withDefaults(defineProps<{
  label: string;
  value: number | string;
  unit?: string;
  spark?: number[];
  delta?: number;
  deltaText?: string;
  accent?: SemanticStatus | 'primary';
  color?: string;
  animateNumber?: boolean;
  animationDuration?: number;
}>(), {
  spark: () => [],
  accent: 'primary',
  animateNumber: true,
  animationDuration: 900,
});

defineEmits<{ (e: 'click', e2: MouseEvent): void }>();

const canvasRef = ref<HTMLCanvasElement>();

const rawNum = ref<number>(typeof props.value === 'number' ? props.value : 0);
watch(() => props.value, (v) => { if (typeof v === 'number') rawNum.value = v; });
const anim = useAnimatedNumber(rawNum, props.animationDuration ?? 900);

const display = computed(() => {
  if (typeof props.value === 'string') return props.value;
  const v = props.animateNumber ? anim.current.value : props.value;
  if (Number.isInteger(props.value as number)) return fmt.integer(v);
  return fmt.decimal(v, 1);
});

const customStyle = computed(() => {
  if (!props.color) return {};
  return {
    '--accent': props.color,
    '--shadow': `0 0 16px ${props.color}66, 0 0 30px ${props.color}22`,
  } as Record<string, string>;
});

const accentIcon = computed(() => {
  const l = props.label.toLowerCase();
  if (l.includes('用户') || l.includes('人口')) return IconUsers;
  if (l.includes('交通') || l.includes('车')) return IconCar;
  if (l.includes('空气') || l.includes('环保') || l.includes('环境')) return IconLeaf;
  if (l.includes('算力') || l.includes('CPU') || l.includes('服务器')) return IconCpu;
  if (l.includes('网') || l.includes('wifi') || l.includes('信号')) return IconWifi;
  if (l.includes('告警') || l.includes('事件')) return IconSignal;
  if (l.includes('趋势') || l.includes('经济') || l.includes('GDP')) return IconChart;
  return IconActivity;
});

const changeClass = computed(() => {
  if (props.deltaText) {
    if (props.deltaText.startsWith('+')) return 'trend-card__change--up';
    if (props.deltaText.startsWith('-')) return 'trend-card__change--down';
    return 'trend-card__change--flat';
  }
  const d = props.delta ?? 0;
  if (d > 0) return 'trend-card__change--up';
  if (d < 0) return 'trend-card__change--down';
  return 'trend-card__change--flat';
});
const changeIcon = computed(() => {
  switch (changeClass.value) {
    case 'trend-card__change--up': return IconArrowUp;
    case 'trend-card__change--down': return IconArrowDown;
    default: return IconMinus;
  }
});
const changeText = computed(() => {
  if (props.deltaText) return props.deltaText;
  const d = props.delta ?? 0;
  if (d === 0) return '0.0%';
  const s = d > 0 ? '+' : '';
  return `${s}${(d * 100).toFixed(1)}%`;
});

/* ---------- Sparkline ---------- */
const { width } = useResize(canvasRef);
watch(width, () => throttledRender());

const throttledRender = rafThrottle(() => draw());
const draw = () => {
  const c = canvasRef.value; if (!c) return;
  const W = c.clientWidth; const H = c.clientHeight;
  if (W <= 0 || H <= 0) return;
  const { ctx } = setupHiDPI(c, W, H);
  ctx.clearRect(0, 0, W, H);
  const arr = props.spark ?? [];
  if (arr.length < 2) return;
  let mn = Infinity; let mx = -Infinity;
  arr.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); });
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = 2;
  const cw = W - pad * 2;
  const ch = H - pad * 2;
  const pts = arr.map((v, i) => {
    const x = pad + (i === arr.length - 1 ? cw : (cw * i) / (arr.length - 1));
    const y = pad + ch - ((v - mn) / (mx - mn)) * ch;
    return [x, y] as const;
  });
  // 面积
  const grad = linearGradient(ctx, 0, pad, 0, H - pad, [
    [0, rgba('#00D4FF', 0.5)],
    [1, rgba('#00D4FF', 0.01)],
  ]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  const last = pts[pts.length - 1];
  const first = pts[0];
  ctx.moveTo(first[0], H - pad);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(last[0], H - pad);
  ctx.closePath();
  ctx.fill();
  // 折线
  ctx.save();
  ctx.strokeStyle = 'var(--accent, var(--accent-cyan))';
  ctx.shadowColor = rgba('#00D4FF', 0.6);
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.stroke();
  ctx.restore();
  // 终点
  const [ex, ey] = last;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = rgba('#00D4FF', 0.9);
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

watch(
  () => [props.spark, props.color, props.accent],
  () => throttledRender(),
  { deep: true },
);

onMounted(() => draw());
onBeforeUnmount(() => { /* noop */ });
</script>

<style scoped lang="css">
.trend-card {
  --accent: var(--accent-cyan);
  --shadow: var(--glow-cyan);
  position: relative;
  padding: 10px 14px 12px;
  display: grid;
  grid-template-rows: auto 1fr 40px;
  gap: 4px;
  cursor: pointer;
  transition: transform .2s, box-shadow .25s, border-color .2s;
}
.trend-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow);
}
.trend-card--primary    { --accent: var(--accent-cyan); }
.trend-card--success    { --accent: var(--color-success); --shadow: var(--glow-success); }
.trend-card--warning    { --accent: var(--color-warning); --shadow: var(--glow-warning); }
.trend-card--danger     { --accent: var(--color-danger); --shadow: var(--glow-danger); }
.trend-card--info       { --accent: var(--color-info); --shadow: 0 0 16px rgba(69,167,255,.35); }

.trend-card__head {
  display: flex; align-items: center; justify-content: space-between;
  color: var(--text-secondary);
}
.trend-card__label { font-size: 0.75rem; letter-spacing: .08em; }
.trend-card--primary .trend-card__head { color: color-mix(in srgb, var(--accent) 80%, var(--text-secondary)); }

.trend-card__body {
  display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
}
.trend-card__kpi { display: inline-flex; align-items: baseline; gap: 4px; }
.trend-card__value {
  color: var(--accent);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent);
}
.trend-card__unit { color: var(--text-secondary); font-size: 0.7rem; letter-spacing: .06em; }
.trend-card__change {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 0.7rem; font-family: 'JetBrains Mono', monospace;
}
.trend-card__change--up   { color: var(--color-success); }
.trend-card__change--down { color: var(--color-danger); }
.trend-card__change--flat { color: var(--text-secondary); }

.trend-card__spark {
  width: 100%; height: 100%; display: block;
}
</style>
