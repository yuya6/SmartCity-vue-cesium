<template>
  <header class="top-nav" :class="{ 'top-nav--bordered': bordered }">
    <div class="top-nav__brand" @pointerdown="$emit('home')">
      <span class="top-nav__logo">
        <component :is="IconBuilding" size="22" color="var(--accent-cyan)" />
      </span>
      <div class="top-nav__titles">
        <div class="top-nav__title smart-title">
          <slot />
        </div>
        <div v-if="subtitle" class="top-nav__subtitle text-secondary">{{ subtitle }}</div>
      </div>
    </div>

    <nav class="top-nav__menu" role="navigation" aria-label="顶部导航">
      <div
        v-for="(item, i) in items"
        :key="i"
        class="top-nav__item"
        :class="{ active: item.key === modelValue }"
        :aria-current="item.key === modelValue ? 'page' : false"
        @pointerdown="onSelect(i)"
      >
        <component v-if="item.icon" :is="item.icon" size="16" />
        <span class="top-nav__item-label">{{ item.label }}</span>
        <StatusDot
          v-if="item.badge != null && item.badge !== 0"
          status="danger"
          :label="String(item.badge)"
          pulse
          size="sm"
        />
      </div>
    </nav>

    <div class="top-nav__right">
      <slot name="right" :now="nowStr">
        <div class="top-nav__status">
          <StatusDot status="success" label="系统正常" pulse />
        </div>
        <div class="top-nav__time mono" :title="nowStr">
          <component :is="IconClock" size="15" />
          <span>{{ compactTime }}</span>
        </div>
        <div class="top-nav__operator text-secondary">
          <component :is="IconUsers" size="15" />
          <span>{{ operator }}</span>
        </div>
      </slot>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * TopNav — 大屏顶栏
 *   Props:
 *    - items:   { key, label, icon?, badge? }[]
 *    - modelValue: 当前选中 key
 *    - subtitle: 品牌副标题
 *    - bordered: 是否显示底部发光边框
 *    - operator: 当前操作员
 */
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue';
import { fmt } from '../shared/hooks';
import { IconBuilding, IconClock, IconUsers } from '../ui/icons';
import StatusDot from '../ui/StatusDot.vue';

export interface TopNavItem {
  key: string | number;
  label: string;
  icon?: Component;
  badge?: number;
}

const props = withDefaults(defineProps<{
  items?: TopNavItem[];
  modelValue?: string | number;
  subtitle?: string;
  bordered?: boolean;
  operator?: string;
}>(), {
  items: () => [],
  operator: '指挥员 01',
  bordered: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number): void;
  (e: 'select', idx: number, item: TopNavItem): void;
  (e: 'home'): void;
}>();

const now = ref(Date.now());
let timer: number | undefined;
onMounted(() => { timer = window.setInterval(() => (now.value = Date.now()), 1000); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });

const nowStr = computed(() => fmt.date(now.value));
const compactTime = computed(() => {
  const d = new Date(now.value);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
});

const onSelect = (i: number) => {
  const it = props.items?.[i]; if (!it) return;
  emit('update:modelValue', it.key);
  emit('select', i, it);
};
</script>

<style scoped lang="css">
.top-nav {
  position: relative;
  height: 64px;
  padding: 0 24px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto minmax(280px, 1fr);
  align-items: center;
  gap: 24px;
  background:
    linear-gradient(180deg, rgba(8,12,36,.92) 0%, rgba(10,14,39,.7) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 20;
}
.top-nav--bordered::after {
  content: '';
  position: absolute;
  left: 10%; right: 10%; bottom: -1px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
  box-shadow: 0 0 12px rgba(0,212,255,.45);
}

.top-nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.top-nav__logo {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(0,212,255,.2), rgba(0,120,212,.25));
  border: 1px solid var(--border-strong);
  box-shadow: 0 0 14px rgba(0,212,255,.35);
}
.top-nav__titles { display: flex; flex-direction: column; gap: 2px; line-height: 1.1; }
.top-nav__title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: .24em;
  color: var(--text-primary);
}
.top-nav__subtitle {
  font-size: 0.72rem;
  letter-spacing: .25em;
  text-transform: uppercase;
}

.top-nav__menu {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border-subtle);
  border-radius: 28px;
  background: rgba(14,22,60,.45);
}
.top-nav__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  letter-spacing: .08em;
  border-radius: 20px;
  cursor: pointer;
  transition: all .2s ease;
  white-space: nowrap;
}
.top-nav__item:hover { color: var(--text-primary); background: rgba(0,212,255,.08); }
.top-nav__item.active {
  color: var(--text-primary);
  background: linear-gradient(90deg, var(--accent-cyan-deep), var(--accent-cyan));
  font-weight: 600;
  box-shadow: 0 0 14px rgba(0,212,255,.4);
}

.top-nav__right {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
}
.top-nav__status { display: inline-flex; align-items: center; }
.top-nav__time {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--accent-cyan);
  font-size: 1rem;
  padding: 4px 10px;
  border-radius: 16px;
  border: 1px solid var(--border-strong);
  background: rgba(0,212,255,.08);
  letter-spacing: .08em;
}
.top-nav__operator {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.78rem;
  letter-spacing: .06em;
}
</style>
