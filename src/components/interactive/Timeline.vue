<template>
  <div
    class="timeline smart-panel"
    :class="[`timeline--${orientation}`]"
    :style="wrapStyle"
  >
    <div v-if="title" class="timeline__title smart-title">
      <slot name="icon" />
      {{ title }}
    </div>
    <div
      class="timeline__track-wrap"
      ref="trackRef"
      @pointerdown="onTrackDown"
    >
      <!-- 时间刻度轴 -->
      <div class="timeline__track" :class="{ 'timeline__track--v': orientation === 'vertical' }">
        <div class="timeline__track-bg" />
        <div class="timeline__track-progress" :style="progressStyle" />
        <!-- 事件点 -->
        <div
          v-for="(ev, i) in events"
          :key="i"
          class="timeline__event"
          :class="[`timeline__event--${ev.status || 'info'}`, { 'timeline__event--active': isActive(i) }]"
          :style="eventStyle(i)"
          @pointerdown.stop="selectEvent(i)"
          :title="ev.title"
        >
          <span class="timeline__dot"></span>
          <div class="timeline__popup">
            <div class="timeline__popup-time mono">{{ formatTime(ev.time) }}</div>
            <div class="timeline__popup-title">{{ ev.title }}</div>
            <div v-if="ev.description" class="timeline__popup-desc text-secondary">{{ ev.description }}</div>
          </div>
        </div>
        <!-- 当前游标 -->
        <div
          v-if="interactive"
          class="timeline__cursor"
          :style="cursorStyle"
        >
          <span class="timeline__cursor-line" />
          <span class="timeline__cursor-dot"></span>
        </div>
      </div>
    </div>
    <!-- 详情列表 -->
    <ul class="timeline__list" v-if="showList">
      <li
        v-for="(ev, i) in events"
        :key="i"
        class="timeline__list-item"
        :class="{ active: selectedIdx === i }"
        @pointerdown="selectEvent(i)"
      >
        <span class="timeline__list-time mono text-secondary">{{ formatTime(ev.time) }}</span>
        <StatusDot :status="ev.status" size="sm" pulse />
        <span class="timeline__list-title">{{ ev.title }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * Timeline — 时间轴控件
 *   Props: TimelineProps
 *   - horizontal: 顶部条带 + 下方事件列表
 *   - vertical:   左侧垂直轴 + 右侧详情
 *   - interactive: 可拖拽游标定位时间（pointer / touch）
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { TimelineProps } from '../shared/types';
import { fmt } from '../shared/hooks';
import StatusDot from '../ui/StatusDot.vue';

const props = withDefaults(defineProps<TimelineProps>(), {
  events: () => [],
  orientation: 'horizontal',
  interactive: true,
  title: '时间轴',
  width: '100%',
  height: 'auto',
});

const emit = defineEmits<{
  (e: 'update:current', v: number): void;
  (e: 'select', idx: number, event: (typeof props.events)[number]): void;
  (e: 'change', v: number): void;
}>();

const trackRef = ref<HTMLDivElement>();
const selectedIdx = ref<number | null>(null);

const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width ?? '100%',
  height: typeof props.height === 'number' ? `${props.height}px` : (props.orientation === 'vertical' ? '100%' : props.height ?? 'auto'),
} as Record<string, string | number>));

const tMin = computed(() => props.events.reduce((m, e) => Math.min(m, e.time), Infinity));
const tMax = computed(() => props.events.reduce((m, e) => Math.max(m, e.time), -Infinity));
const tRange = computed(() => Math.max(1, (tMax.value - tMin.value) || 1));

const currentTime = ref<number>(props.current ?? tMin.value);
watch(
  () => props.current,
  (v) => { if (typeof v === 'number') currentTime.value = v; },
  { immediate: true },
);
watch(currentTime, (v) => { emit('update:current', v); emit('change', v); });

const ratio = computed(() => Math.max(0, Math.min(1, (currentTime.value - tMin.value) / tRange.value)));
const progressStyle = computed(() => props.orientation === 'horizontal'
  ? { width: `${ratio.value * 100}%` }
  : { height: `${ratio.value * 100}%` });
const cursorStyle = computed(() => props.orientation === 'horizontal'
  ? { left: `calc(${ratio.value * 100}% - 6px)` }
  : { top: `calc(${ratio.value * 100}% - 6px)` });

function eventRatio(i: number) {
  return Math.max(0, Math.min(1, (props.events[i].time - tMin.value) / tRange.value));
}
const eventStyle = (i: number) => {
  const r = eventRatio(i);
  return props.orientation === 'horizontal'
    ? { left: `calc(${r * 100}% - 6px)` }
    : { top: `calc(${r * 100}% - 6px)` };
};

const showList = computed(() => props.orientation === 'horizontal');

const isActive = (i: number) => {
  if (selectedIdx.value === i) return true;
  if (typeof props.current !== 'number' || !props.events[i]) return false;
  return props.events[i].time === props.current;
};

function formatTime(t: number) {
  if (props.timeFormatter) return props.timeFormatter(t);
  // 启发：大于 1e12 认为是时间戳毫秒，否则是刻度值
  if (t > 1e12) return fmt.date(t);
  return String(t);
}

function selectEvent(i: number) {
  const ev = props.events[i];
  if (!ev) return;
  selectedIdx.value = i;
  currentTime.value = ev.time;
  emit('select', i, ev);
}

/* ---------- 拖拽游标 ---------- */
let dragging = false;
const onDrag = (e: PointerEvent) => {
  if (!dragging || !trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  let r = 0;
  if (props.orientation === 'horizontal') {
    r = (e.clientX - rect.left) / rect.width;
  } else {
    r = (e.clientY - rect.top) / rect.height;
  }
  r = Math.max(0, Math.min(1, r));
  currentTime.value = tMin.value + r * tRange.value;
};
const onUp = () => { dragging = false; window.removeEventListener('pointermove', onDrag); window.removeEventListener('pointerup', onUp); };
const onTrackDown = (e: PointerEvent) => {
  if (!props.interactive) return;
  dragging = true;
  trackRef.value?.setPointerCapture?.(e.pointerId);
  onDrag(e);
  window.addEventListener('pointermove', onDrag);
  window.addEventListener('pointerup', onUp);
};

onBeforeUnmount(() => onUp());

/* ---------- 键盘方向键支持 ---------- */
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    const next = (selectedIdx.value ?? -1) + 1;
    if (next < props.events.length) selectEvent(next);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    const next = (selectedIdx.value ?? 0) - 1;
    if (next >= 0) selectEvent(next);
  }
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

defineExpose({ selectEvent, setCurrent: (t: number) => { currentTime.value = t; } });
</script>

<style scoped lang="css">
.timeline {
  display: grid;
  gap: 8px;
  padding: 10px 14px 14px;
}
.timeline--horizontal { grid-template-rows: auto auto auto; }
.timeline--vertical   { grid-template-columns: 56px 1fr; grid-template-rows: auto 1fr; grid-template-areas: "title title" "track list"; }

.timeline__title { font-size: 0.9rem; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
.timeline--vertical .timeline__title { grid-area: title; }

.timeline__track-wrap {
  position: relative;
  padding: 14px 10px 16px;
  grid-area: track;
  min-height: 0;
}
.timeline__track {
  position: relative;
  width: 100%;
  height: 6px;
}
.timeline__track--v {
  width: 6px; height: 100%;
  margin: 0 auto;
}
.timeline__track-bg, .timeline__track-progress {
  position: absolute; inset: 0;
  border-radius: 4px;
}
.timeline__track-bg {
  background: linear-gradient(90deg, rgba(30,60,140,.35), rgba(30,60,140,.35));
}
.timeline__track--v .timeline__track-bg { background: linear-gradient(180deg, rgba(30,60,140,.35), rgba(30,60,140,.35)); }
.timeline__track-progress {
  background: linear-gradient(90deg, var(--accent-cyan-deep), var(--accent-cyan));
  box-shadow: 0 0 10px rgba(0,212,255,.5);
  width: 0%;
  transition: width .15s linear;
}
.timeline__track--v .timeline__track-progress {
  background: linear-gradient(180deg, var(--accent-cyan-deep), var(--accent-cyan));
  width: 100%; height: 0%; transition: height .15s linear;
}

.timeline__event {
  position: absolute;
  top: -3px;
  width: 12px; height: 12px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
}
.timeline__track--v .timeline__event { left: -3px; top: auto; }
.timeline__dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--accent-cyan);
  box-shadow: 0 0 8px var(--accent-cyan);
  border: 2px solid var(--bg-panel);
  transition: transform .15s;
}
.timeline__event:hover .timeline__dot,
.timeline__event--active .timeline__dot { transform: scale(1.5); }

.timeline__event--success .timeline__dot { background: var(--color-success); box-shadow: 0 0 8px var(--color-success); }
.timeline__event--warning .timeline__dot { background: var(--color-warning); box-shadow: 0 0 8px var(--color-warning); }
.timeline__event--danger  .timeline__dot { background: var(--color-danger);  box-shadow: 0 0 10px var(--color-danger); }
.timeline__event--primary .timeline__dot { background: var(--accent-cyan); }

.timeline__popup {
  position: absolute;
  bottom: 140%;
  left: 50%;
  transform: translateX(-50%) scale(.95);
  min-width: 150px;
  padding: 6px 10px;
  background: rgba(10,14,39,.95);
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  font-size: 0.72rem;
  opacity: 0; pointer-events: none;
  transition: opacity .18s, transform .18s;
  z-index: 3;
}
.timeline__track--v .timeline__popup {
  left: 150%; top: 50%; bottom: auto;
  transform: translateY(-50%) scale(.95);
}
.timeline__event:hover .timeline__popup,
.timeline__event--active .timeline__popup {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}
.timeline__track--v .timeline__event:hover .timeline__popup,
.timeline__track--v .timeline__event--active .timeline__popup {
  transform: translate(0, -50%) scale(1);
}
.timeline__popup-time { font-size: 0.65rem; color: var(--accent-cyan); margin-bottom: 2px; }
.timeline__popup-title { font-weight: 600; }
.timeline__popup-desc { font-size: 0.68rem; margin-top: 2px; }

.timeline__cursor {
  position: absolute;
  width: 12px; height: 12px;
  pointer-events: none;
  z-index: 4;
  top: -3px;
}
.timeline__cursor-line {
  position: absolute;
  left: 5px;
  top: -40px;
  width: 2px; height: 52px;
  background: var(--color-warning);
  box-shadow: 0 0 8px var(--color-warning);
}
.timeline__track--v .timeline__cursor {
  top: auto; left: -3px;
}
.timeline__track--v .timeline__cursor-line {
  left: -40px; top: 5px;
  height: 2px; width: 52px;
}
.timeline__cursor-dot {
  position: absolute; inset: 0;
  border-radius: 999px;
  background: var(--color-warning);
  box-shadow: 0 0 14px var(--color-warning);
}

.timeline__list {
  grid-column: 1 / -1;
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 190px;
  overflow-y: auto;
}
.timeline--vertical .timeline__list {
  grid-area: list;
  margin: 0 0 0 8px;
  max-height: none;
  height: 100%;
}
.timeline__list-item {
  display: grid;
  grid-template-columns: 90px 14px 1fr;
  gap: 8px;
  align-items: center;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: background .15s, color .15s;
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.timeline__list-item:hover,
.timeline__list-item.active {
  background: rgba(0,212,255,.08);
  color: var(--text-primary);
}
.timeline__list-time { font-size: 0.7rem; }
.timeline__list-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
