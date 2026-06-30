// 单行横向滚动文字条（底栏预警/通知用）
<template>
  <div class="marquee" ref="wrapRef">
    <div class="marquee__track" ref="trackRef">
      <div class="marquee__list">
        <span
          v-for="(t, i) in doubled"
          :key="i"
          class="marquee__item"
        >
          <span class="marquee__dot" />
          {{ t }}
          <span class="marquee__sep">◆</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * MarqueeScroll — 单行横向滚动文字条（底栏预警/通知用）
 *   Props:
 *    - items: 文字项数组
 *    - speed: 每秒像素（默认 60）
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  items: string[];
  speed?: number;
}>(), {
  items: () => [],
  speed: 60,
});

const trackRef = ref<HTMLDivElement>();
const doubled = computed(() => [...props.items, ...props.items]);
// 模板中使用的外层 ref（保留以便后续扩展）

let raf = 0;
let pos = 0;
let last = 0;
const step = (ts: number) => {
  if (!last) last = ts;
  const dt = (ts - last) / 1000;
  last = ts;
  const track = trackRef.value?.firstElementChild as HTMLElement | undefined;
  if (track) {
    const half = track.scrollWidth / 2;
    pos += props.speed * dt;
    if (pos >= half) pos -= half;
    track.style.transform = `translateX(${-pos}px)`;
  }
  raf = requestAnimationFrame(step);
};

const start = () => {
  cancelAnimationFrame(raf);
  last = 0;
  raf = requestAnimationFrame(step);
};

watch(
  () => props.items,
  () => { pos = 0; start(); },
  { deep: true },
);

onMounted(start);
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<style scoped lang="css">
.marquee {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(90deg, transparent, #000 30px, #000 calc(100% - 30px), transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 30px, #000 calc(100% - 30px), transparent);
}
.marquee__track {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}
.marquee__list {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  will-change: transform;
}
.marquee__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 22px 0 6px;
  font-size: 0.82rem;
}
.marquee__dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.marquee__sep { color: var(--text-tertiary); }
</style>
