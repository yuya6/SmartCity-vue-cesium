// 区县地图
<template>
  <div
    ref="wrapRef"
    class="region-map smart-panel"
    :style="wrapStyle"
  >
    <div v-if="title" class="region-map__title smart-title">{{ title }}</div>
    <div class="region-map__body relative">
      <svg
        ref="svgRef"
        class="region-map__svg"
        viewBox="0 0 1000 720"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- 定义渐变滤镜 -->
        <defs>
          <filter id="region-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="region-center-dot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
            <stop offset="60%" stop-color="#00D4FF" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#00D4FF" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- 外围装饰：扫描线 -->
        <g class="region-map__scan">
          <circle
            :cx="centerPt.x" :cy="centerPt.y"
            r="300"
            fill="none"
            stroke="rgba(0,212,255,.25)"
            stroke-width="1"
          />
          <circle
            :cx="centerPt.x" :cy="centerPt.y"
            r="200"
            fill="none"
            stroke="rgba(0,212,255,.4)"
            stroke-width="1"
            stroke-dasharray="4 4"
          />
          <line
            :x1="centerPt.x" :y1="centerPt.y"
            :x2="centerPt.x + 260 * Math.cos(scanAngle)"
            :y2="centerPt.y + 260 * Math.sin(scanAngle)"
            stroke="rgba(0,212,255,.6)"
            stroke-width="1.5"
          />
        </g>

        <!-- 区县路径 -->
        <g class="region-map__regions">
          <path
            v-for="r in regions"
            :key="r.id"
            :d="r.path"
            :fill="fillFor(r.id)"
            stroke="rgba(0,212,255,.45)"
            stroke-width="1.2"
            :class="['region-map__path', { active: r.id === modelValue, hover: hoveredId === r.id }]"
            :filter="(r.id === modelValue || hoveredId === r.id) ? 'url(#region-glow)' : undefined"
            @pointerenter="hoveredId = r.id"
            @pointerleave="hoveredId = null"
            @pointerdown="onSelect(r)"
          />
        </g>

        <!-- 区县名称 -->
        <g class="region-map__labels" pointer-events="none">
          <text
            v-for="r in regions"
            :key="'l_' + r.id"
            :x="r.cx"
            :y="r.cy"
            text-anchor="middle"
            class="region-map__name"
            :class="{ active: r.id === modelValue }"
          >
            {{ r.name }}
          </text>
          <text
            v-for="r in regions"
            :key="'v_' + r.id"
            :x="r.cx"
            :y="r.cy + 14"
            text-anchor="middle"
            class="region-map__value mono"
          >
            {{ valueOf(r.id) }}
          </text>
        </g>

        <!-- 中央定位点（市政府/广州塔） -->
        <g class="region-map__center" :transform="`translate(${centerPt.x}, ${centerPt.y})`">
          <circle r="10" fill="url(#region-center-dot)">
            <animate attributeName="r" values="8; 16; 8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1; .4; 1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="3.5" fill="#FFFFFF" />
          <text x="0" y="22" text-anchor="middle" class="region-map__center-label">广州塔</text>
        </g>
      </svg>

      <!-- Tooltip -->
      <div
        v-if="tooltip && hovered"
        class="region-map__tip"
        :style="tipStyle"
      >
        <div class="region-map__tip-name">{{ hovered.name }}</div>
        <div class="region-map__tip-val mono">{{ valueOf(hovered.id) }} <span class="text-secondary">人</span></div>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="showLegend" class="region-map__legend">
      <span class="text-secondary text-xs">低</span>
      <div class="region-map__legend-bar" :style="legendStyle" />
      <span class="text-secondary text-xs">高</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * RegionMap — 广州市 11 区县简化轮廓 SVG 示意 + 热力填充
 *   路径为形状近似的示意多边形（非精确地理边界），用于大屏展示。
 *   Props: RegionMapProps
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { RegionMapProps, RegionMapItem } from '../shared/types';
import { mixColor } from '../shared/canvas-utils';

/* 广州 11 区县：id 名 + 名称 + 近似多边形（viewBox 1000×720） */
const regions = [
  // 北部：从化（左上大片）、花都
  {
    id: 'conghua', name: '从化区',
    path: 'M140,120 L260,60 L420,90 L480,180 L400,260 L280,300 L160,260 L100,200 Z',
    cx: 280, cy: 180,
  },
  {
    id: 'huadu', name: '花都区',
    path: 'M100,200 L160,260 L280,300 L340,270 L380,330 L260,380 L140,360 L90,300 Z',
    cx: 220, cy: 320,
  },
  // 中部北部：白云
  {
    id: 'baiyun', name: '白云区',
    path: 'M260,380 L380,330 L430,300 L500,330 L520,420 L460,480 L340,470 L280,450 Z',
    cx: 400, cy: 400,
  },
  // 市中心：越秀、海珠、荔湾、天河、黄埔
  {
    id: 'tianhe', name: '天河区',
    path: 'M500,420 L580,400 L620,450 L600,510 L540,520 L500,490 Z',
    cx: 550, cy: 460,
  },
  {
    id: 'yuexiu', name: '越秀区',
    path: 'M460,470 L500,420 L500,490 L540,520 L520,550 L460,540 L430,500 Z',
    cx: 480, cy: 500,
  },
  {
    id: 'liwan', name: '荔湾区',
    path: 'M340,470 L460,470 L430,500 L460,540 L400,560 L320,530 L300,490 Z',
    cx: 385, cy: 510,
  },
  {
    id: 'haizhu', name: '海珠区',
    path: 'M460,540 L520,550 L540,520 L600,510 L610,570 L560,620 L470,600 L440,570 Z',
    cx: 520, cy: 570,
  },
  {
    id: 'huangpu', name: '黄埔区',
    path: 'M580,400 L720,370 L760,460 L720,530 L620,510 L600,450 Z',
    cx: 670, cy: 450,
  },
  // 东：增城
  {
    id: 'zengcheng', name: '增城区',
    path: 'M720,370 L860,300 L900,400 L880,520 L800,560 L720,530 L760,460 Z',
    cx: 810, cy: 430,
  },
  // 南：番禺
  {
    id: 'panyu', name: '番禺区',
    path: 'M320,530 L470,600 L560,620 L600,650 L540,700 L420,690 L300,640 L280,570 Z',
    cx: 430, cy: 625,
  },
  // 南：南沙
  {
    id: 'nansha', name: '南沙区',
    path: 'M560,650 L680,640 L740,690 L680,720 L560,720 L520,690 Z',
    cx: 625, cy: 685,
  },
] as const;

const defaultStops: Array<[number, string]> = [
  [0.0, '#0A1A4C'],
  [0.3, '#0D4A9B'],
  [0.6, '#1282D0'],
  [0.85, '#00D4FF'],
  [1.0, '#9AFFF0'],
];

const props = withDefaults(defineProps<RegionMapProps & { title?: string; showLegend?: boolean; width?: string | number; height?: string | number }>(), {
  data: () => [],
  showLegend: true,
  title: '广州 · 区域分布',
  tooltip: true,
  hoverable: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
  (e: 'select', item: RegionMapItem | undefined): void;
}>();

const svgRef = ref<SVGSVGElement>();
const wrapRef = ref<HTMLDivElement>();
const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width || '100%',
  height: typeof props.height === 'number' ? `${props.height}px` : props.height || '100%',
  padding: '10px 12px 12px',
} as Record<string, string | number>));

const dataMap = computed(() => new Map((props.data ?? []).map((d) => [d.id, d])));

const vmin = computed(() => props.data?.reduce((m, d) => Math.min(m, d.value), Infinity) ?? 0);
const vmax = computed(() => props.data?.reduce((m, d) => Math.max(m, d.value), -Infinity) ?? 0);

const stops_ = computed<Array<[number, string]>>(() => props.colorStops?.length ? props.colorStops : defaultStops);

function valueOf(id: string) {
  const d = dataMap.value.get(id);
  if (!d) return '—';
  if (d.value >= 10000) return `${(d.value / 10000).toFixed(1)}万`;
  return d.value.toLocaleString('zh-CN');
}

function colorOf(id: string) {
  const d = dataMap.value.get(id);
  const t = d && vmax.value !== vmin.value
    ? (d.value - vmin.value) / (vmax.value - vmin.value)
    : 0.3;
  const stops = stops_.value;
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t >= p0 && t <= p1) {
      const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
      return mixColor(c0, c1, k);
    }
  }
  return stops[0][1];
}

function fillFor(id: string) {
  return colorOf(id);
}

const legendStyle = computed(() => {
  const stops = stops_.value.map(([p, c]) => `${c} ${(p * 100).toFixed(1)}%`).join(', ');
  return { background: `linear-gradient(90deg, ${stops})` };
});

/* 交互 */
const hoveredId = ref<string | null>(null);
const hovered = computed(() => hoveredId.value ? regions.find((r) => r.id === hoveredId.value) : null);
const tipStyle = computed(() => {
  if (!hovered.value) return {};
  // 将 SVG viewBox 坐标转换为 DOM 坐标
  const svg = svgRef.value;
  if (!svg) return {};
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const sx = rect.width / vb.width;
  const sy = rect.height / vb.height;
  const wrapRect = wrapRef.value!.getBoundingClientRect();
  return {
    left: `${rect.left - wrapRect.left + hovered.value.cx * sx + 12}px`,
    top: `${rect.top - wrapRect.top + hovered.value.cy * sy - 28}px`,
  };
});

function onSelect(r: { id: string; name: string }) {
  emit('update:modelValue', r.id);
  const it = props.data?.find((d) => d.id === r.id) ?? ({ id: r.id, name: r.name, value: 0 });
  emit('select', it);
}

/* 扫描动画角度 */
const centerPt = { x: 500, y: 420 };
const scanAngle = ref(0);
let scanRaf = 0;
const stepScan = () => {
  scanAngle.value += 0.012;
  scanRaf = requestAnimationFrame(stepScan);
};
onMounted(() => { scanRaf = requestAnimationFrame(stepScan); });
onBeforeUnmount(() => cancelAnimationFrame(scanRaf));

defineExpose({
  refresh: () => { /* SVG 响应式，无需额外操作 */ },
});
</script>

<style scoped lang="css">
.region-map { display: flex; flex-direction: column; }
.region-map__title { font-size: 0.9rem; margin-bottom: 4px; }
.region-map__body { flex: 1; min-height: 0; position: relative; }
.region-map__svg { width: 100%; height: 100%; display: block; }

.region-map__path {
  cursor: pointer;
  transition: fill .2s ease, stroke .2s ease, transform .2s ease;
  transform-origin: center;
  transform-box: fill-box;
}
.region-map__path:hover {
  stroke: #FFFFFF !important;
  stroke-width: 2;
}
.region-map__path.active {
  stroke: #FFFFFF !important;
  stroke-width: 2;
  animation: region-glow-breathe 2.4s ease-in-out infinite;
}
@keyframes region-glow-breathe {
  0%,100% { filter: drop-shadow(0 0 4px rgba(0,212,255,.5)); }
  50%     { filter: drop-shadow(0 0 14px rgba(0,212,255,.95)); }
}

.region-map__name {
  font-size: 14px;
  font-weight: 600;
  fill: rgba(255,255,255,.9);
  letter-spacing: .06em;
  paint-order: stroke;
  stroke: rgba(0,0,0,.55);
  stroke-width: 3;
}
.region-map__name.active { fill: var(--accent-cyan); }
.region-map__value {
  font-size: 11px;
  fill: rgba(0,212,255,.95);
  letter-spacing: .02em;
  paint-order: stroke;
  stroke: rgba(0,0,0,.6);
  stroke-width: 3;
}
.region-map__center-label {
  fill: #fff;
  font-size: 11px;
  letter-spacing: .08em;
  font-weight: 600;
}
.region-map__tip {
  position: absolute;
  padding: 6px 10px;
  background: rgba(10,14,39,.95);
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  pointer-events: none;
  font-size: 0.75rem;
  z-index: 5;
  min-width: 110px;
  box-shadow: 0 0 18px rgba(0,212,255,.25);
}
.region-map__tip-name { color: var(--accent-cyan); font-weight: 600; letter-spacing: .06em; }
.region-map__tip-val { margin-top: 2px; color: var(--text-primary); font-size: 0.9rem; }

.region-map__legend {
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px;
  font-size: 0.7rem;
}
.region-map__legend-bar {
  flex: 1; height: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
}
.text-xs { font-size: 0.7rem; }
</style>
