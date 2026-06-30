<template>
  <div
    ref="wrapRef"
    class="smart-chart pie-chart smart-panel"
    :style="wrapStyle"
  >
    <div v-if="title" class="pie-chart__title smart-title">{{ title }}</div>
    <div class="pie-chart__body">
      <canvas ref="canvasRef" class="pie-chart__canvas" />
      <!-- 中心文字（donut 模式） -->
      <div v-if="donut && centerText" class="pie-chart__center">
        <div class="pie-chart__center-value mono">{{ centerValue }}</div>
        <div class="pie-chart__center-label text-secondary">{{ centerText }}</div>
      </div>
    </div>
    <ul v-if="showLegend" class="pie-chart__legend">
      <li
        v-for="(s, i) in legendItems"
        :key="i"
        class="pie-chart__legend-item"
        @pointerenter="hoverSlice(i, true)"
        @pointerleave="hoverSlice(i, false)"
        @pointerdown="$emit('sliceClick', i, data?.[i])"
      >
        <span class="dot" :style="{ background: s.color, boxShadow: `0 0 8px ${s.color}` }" />
        <span class="name">{{ s.label }}</span>
        <span class="pct mono">{{ s.pct }}</span>
        <span class="val mono">{{ s.val }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * PieChart — 饼图 / 环形图
 * Props: PieChartProps
 * 特点：
 *  - 可选中心汇总文字、右侧/底部图例
 *  - 悬停图例可高亮对应扇区
 *  - 数据变化扇区展开动画
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useResize, rafThrottle } from '../shared/hooks';
import type { PieChartProps, PieChartSlice } from '../shared/types';
import { setupHiDPI, rgba, defaultColors, mixColor } from '../shared/canvas-utils';

const props = withDefaults(defineProps<PieChartProps>(), {
  data: () => [],
  donut: true,
  donutRatio: 0.62,
  width: '100%',
  height: 240,
  autoResize: true,
  animationDuration: 700,
  showLegend: true,
  title: '',
  size: 'md',
});

const emit = defineEmits<{
  (e: 'sliceClick', idx: number, slice: PieChartSlice | undefined): void;
  (e: 'sliceHover', idx: number | null, slice: PieChartSlice | null): void;
}>();

const wrapRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  padding: '10px 12px 12px',
  ...(props.backgroundStyle || {}),
} as Record<string, string | number>));

const centerText = computed(() => {
  const total = sumData();
  if (!total) return '';
  return props.data?.length ? '总计' : '';
});
const centerValue = computed(() => {
  const v = sumData();
  if (props.valueFormatter) return props.valueFormatter(v);
  return v.toLocaleString('zh-CN');
});
const sumData = () => (props.data ?? []).reduce((s, d) => s + (d.value || 0), 0);

const anim = { progress: 0, raf: 0, startTs: 0, from: 0, to: 1 };
const sliceColors = computed(() => {
  const n = props.data?.length ?? 0;
  const base = defaultColors(n, props.colors);
  return (props.data ?? []).map((d, i) => d.color || base[i]);
});
const legendItems = computed(() => {
  const total = sumData() || 1;
  return (props.data ?? []).map((d, i) => ({
    label: d.label,
    color: sliceColors.value[i],
    pct: `${(d.value / total * 100).toFixed(1)}%`,
    val: props.valueFormatter ? props.valueFormatter(d.value) : d.value.toLocaleString('zh-CN'),
  }));
});

const hoveredIdx = shallowRef<number | null>(null);
const hoverSlice = (i: number, on: boolean) => {
  hoveredIdx.value = on ? i : null;
  emit('sliceHover', hoveredIdx.value, hoveredIdx.value != null ? props.data?.[hoveredIdx.value] : null);
};

const playAnim = () => {
  cancelAnimationFrame(anim.raf);
  anim.progress = 0; anim.startTs = 0;
  const step = (ts: number) => {
    if (!anim.startTs) anim.startTs = ts;
    const t = props.animationDuration > 0 ? Math.min(1, (ts - anim.startTs) / props.animationDuration) : 1;
    anim.progress = 1 - Math.pow(1 - t, 3);
    render();
    if (t < 1) anim.raf = requestAnimationFrame(step);
  };
  anim.raf = requestAnimationFrame(step);
};

const throttledRender = rafThrottle(() => render());

const slicesRef = shallowRef<Array<{ start: number; end: number; idx: number }>>([]);

const render = () => {
  const wrap = wrapRef.value; const canvas = canvasRef.value;
  if (!wrap || !canvas) return;
  // canvas 区域 = body 高度
  const body = wrap.querySelector<HTMLElement>('.pie-chart__body');
  if (!body) return;
  const W = body.clientWidth;
  const H = body.clientHeight;
  if (W <= 0 || H <= 0) return;
  const { ctx } = setupHiDPI(canvas, W, H);
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) / 2 - 10;
  const rInner = r * (props.donut ? props.donutRatio! : 0);

  const data = props.data ?? [];
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const prog = anim.progress;
  if (!total || !r) { slicesRef.value = []; return; }

  const slices: Array<{ start: number; end: number; idx: number }> = [];
  let acc = -Math.PI / 2; // 从 12 点方向开始
  data.forEach((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2 * prog;
    const start = acc;
    const end = acc + sweep;
    acc += sweep;
    slices.push({ start, end, idx: i });
    const color = sliceColors.value[i];
    const isHover = hoveredIdx.value === i;
    const rr = isHover ? r + 6 : r;
    const rrI = isHover ? rInner + 2 : rInner;
    const fillColor = isHover ? mixColor(color, '#FFFFFF', 0.12) : color;

    ctx.save();
    ctx.shadowColor = rgba(color, 0.4);
    ctx.shadowBlur = isHover ? 18 : 10;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, start, end, false);
    if (props.donut) ctx.arc(cx, cy, rrI, end, start, true);
    else ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // 内描边
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba('#050816', 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  });
  slicesRef.value = slices;
};

const onClick = (e: PointerEvent) => {
  const wrap = wrapRef.value; if (!wrap) return;
  const body = wrap.querySelector<HTMLElement>('.pie-chart__body');
  if (!body) return;
  const rect = body.getBoundingClientRect();
  const x = e.clientX - rect.left - body.clientWidth / 2;
  const y = e.clientY - rect.top - body.clientHeight / 2;
  const dist = Math.hypot(x, y);
  const W = body.clientWidth, H = body.clientHeight;
  const r = Math.min(W, H) / 2 - 10;
  const rInner = r * (props.donut ? props.donutRatio! : 0);
  if (dist < rInner || dist > r + 6) return;
  let angle = Math.atan2(y, x) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  const data = props.data ?? [];
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let acc = 0;
  for (let i = 0; i < data.length; i++) {
    const sweep = (data[i].value / total) * Math.PI * 2;
    if (angle >= acc && angle < acc + sweep) {
      emit('sliceClick', i, data[i]);
      return;
    }
    acc += sweep;
  }
};
const onMove = (e: PointerEvent) => {
  const wrap = wrapRef.value; if (!wrap) return;
  const body = wrap.querySelector<HTMLElement>('.pie-chart__body');
  if (!body) return;
  const rect = body.getBoundingClientRect();
  const x = e.clientX - rect.left - body.clientWidth / 2;
  const y = e.clientY - rect.top - body.clientHeight / 2;
  const dist = Math.hypot(x, y);
  const W = body.clientWidth, H = body.clientHeight;
  const r = Math.min(W, H) / 2 - 10;
  const rInner = r * (props.donut ? props.donutRatio! : 0);
  if (dist < rInner || dist > r + 6) { hoveredIdx.value = null; emit('sliceHover', null, null); return; }
  let angle = Math.atan2(y, x) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  const data = props.data ?? [];
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let acc = 0;
  for (let i = 0; i < data.length; i++) {
    const sweep = (data[i].value / total) * Math.PI * 2;
    if (angle >= acc && angle < acc + sweep) {
      hoveredIdx.value = i; emit('sliceHover', i, data[i]); return;
    }
    acc += sweep;
  }
  hoveredIdx.value = null;
};

const { width, height } = useResize(wrapRef, () => props.autoResize && throttledRender());
watch([width, height], () => throttledRender());

watch(hoveredIdx, () => render());
watch(
  () => props.data,
  () => playAnim(),
  { deep: true },
);

defineExpose({ refresh: () => render() });

onMounted(() => {
  const body = wrapRef.value?.querySelector<HTMLElement>('.pie-chart__body');
  body?.addEventListener('pointerdown', onClick);
  body?.addEventListener('pointermove', onMove);
  body?.addEventListener('pointerleave', () => { hoveredIdx.value = null; emit('sliceHover', null, null); });
  playAnim();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(anim.raf);
  const body = wrapRef.value?.querySelector<HTMLElement>('.pie-chart__body');
  body?.removeEventListener('pointerdown', onClick);
  body?.removeEventListener('pointermove', onMove);
});
</script>

<style scoped lang="css">
.pie-chart { display: flex; flex-direction: column; overflow: hidden; }
.pie-chart__title { font-size: 0.9rem; margin-bottom: 6px; }
.pie-chart__body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pie-chart__canvas { display: block; width: 100%; height: 100%; }
.pie-chart__center {
  position: absolute;
  text-align: center;
  pointer-events: none;
}
.pie-chart__center-value {
  font-size: 1.4rem;
  color: var(--accent-cyan);
  text-shadow: 0 0 10px rgba(0,212,255,.6);
  letter-spacing: .04em;
}
.pie-chart__center-label {
  font-size: 0.75rem;
  letter-spacing: .2em;
  margin-top: 2px;
}
.pie-chart__legend {
  list-style: none;
  margin: 6px 0 0;
  padding: 6px 2px 0;
  border-top: 1px dashed var(--border-subtle);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 12px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: default;
}
.pie-chart__legend-item {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  gap: 6px;
  align-items: center;
  padding: 3px 4px;
  border-radius: 3px;
  transition: background .2s;
}
.pie-chart__legend-item:hover { background: rgba(0,212,255,.08); color: var(--text-primary); }
.pie-chart__legend-item .dot { width: 8px; height: 8px; border-radius: 2px; }
.pie-chart__legend-item .name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pie-chart__legend-item .pct { color: var(--accent-cyan); letter-spacing: .02em; }
.pie-chart__legend-item .val { color: var(--text-primary); min-width: 44px; text-align: right; }
</style>
