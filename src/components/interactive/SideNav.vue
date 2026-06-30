<template>
  <aside class="side-nav" :class="[`side-nav--${placement}`]">
    <ul class="side-nav__list" role="menu">
      <li
        v-for="(item, i) in items"
        :key="item.key"
        class="side-nav__item"
        :class="{ active: item.key === modelValue, 'has-icon': !!item.icon }"
        role="menuitem"
        :aria-current="item.key === modelValue"
        @pointerdown="onSelect(i)"
      >
        <div class="side-nav__glow" />
        <span v-if="item.icon" class="side-nav__icon">
          <component :is="item.icon" size="18" />
        </span>
        <span class="side-nav__label">{{ item.label }}</span>
        <span v-if="item.badge != null" class="side-nav__badge mono" :class="badgeClass(item.badge)">{{ fmtBadge(item.badge) }}</span>
      </li>
    </ul>
    <div v-if="$slots.footer" class="side-nav__footer">
      <slot name="footer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * SideNav — 侧边导航栏（左侧/右侧 标签列表）
 *   Props:
 *    - items: { key, label, icon?, badge? }
 *    - modelValue: 当前 key (v-model)
 *    - placement: 'left' | 'right'
 */
import type { Component } from 'vue';
import { fmt } from '../shared/hooks';

export interface SideNavItem {
  key: string | number;
  label: string;
  icon?: Component;
  badge?: number;
}

const props = withDefaults(defineProps<{
  items?: SideNavItem[];
  modelValue?: string | number;
  placement?: 'left' | 'right';
}>(), {
  items: () => [],
  placement: 'left',
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number): void;
  (e: 'select', idx: number, item: SideNavItem): void;
}>();

const onSelect = (i: number) => {
  const it = props.items?.[i]; if (!it) return;
  emit('update:modelValue', it.key);
  emit('select', i, it);
};

const fmtBadge = (n: number) => n >= 100 ? fmt.compact(n, 0) : String(n);
const badgeClass = (n: number) => (n > 20 ? 'is-high' : n > 5 ? 'is-mid' : '');
</script>

<style scoped lang="css">
.side-nav {
  display: flex;
  flex-direction: column;
  width: 220px;
  padding: 12px 8px;
  background:
    linear-gradient(180deg, rgba(12,18,48,.9), rgba(10,14,39,.72));
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  gap: 8px;
  position: relative;
  overflow: hidden;
}
.side-nav::before, .side-nav::after {
  content: '';
  position: absolute;
  width: 10px; height: 10px;
  border: 1px solid var(--accent-cyan);
  pointer-events: none;
}
.side-nav::before { top: 0; left: 0; border-right: 0; border-bottom: 0; }
.side-nav::after  { bottom: 0; right: 0; border-left: 0; border-top: 0; }

.side-nav__list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.side-nav__item {
  position: relative;
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 3px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  letter-spacing: .06em;
  cursor: pointer;
  transition: color .2s, background .2s, transform .15s;
  z-index: 1;
}
.side-nav__glow {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(0,212,255,.22), rgba(0,212,255,.02) 70%, transparent);
  opacity: 0;
  transition: opacity .2s;
}
.side-nav__item:hover { color: var(--text-primary); }
.side-nav__item:hover .side-nav__glow { opacity: 1; }
.side-nav__item.active {
  color: var(--text-primary);
  font-weight: 600;
}
.side-nav__item.active .side-nav__glow {
  opacity: 1;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--accent-cyan) 55%, transparent), rgba(0,212,255,.08) 60%, transparent),
    linear-gradient(90deg, var(--accent-cyan), transparent) left center/3px 100% no-repeat;
  box-shadow: 0 0 16px rgba(0,212,255,.25) inset;
}
.side-nav__icon { display: inline-flex; color: inherit; }
.side-nav__item.has-icon .side-nav__icon { color: var(--accent-cyan); }
.side-nav__item.active .side-nav__icon { color: #fff; text-shadow: 0 0 8px var(--accent-cyan); }
.side-nav__label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.side-nav__badge {
  min-width: 22px;
  padding: 1px 6px;
  text-align: center;
  font-size: 0.65rem;
  background: rgba(0,212,255,.18);
  color: var(--accent-cyan);
  border-radius: 10px;
  border: 1px solid var(--border-strong);
}
.side-nav__badge.is-mid { background: rgba(255,176,32,.18); color: var(--color-warning); border-color: rgba(255,176,32,.45); }
.side-nav__badge.is-high { background: rgba(255,77,79,.18); color: var(--color-danger); border-color: rgba(255,77,79,.45); animation: badge-pulse 1.6s ease-in-out infinite; }

@keyframes badge-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,77,79,.4); }
  50%     { box-shadow: 0 0 0 4px rgba(255,77,79,0); }
}

.side-nav__footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--border-subtle);
  color: var(--text-tertiary);
  font-size: 0.72rem;
  letter-spacing: .08em;
}
.side-nav--right { .side-nav__glow { background: linear-gradient(270deg, rgba(0,212,255,.22), transparent); } }
.side-nav--right .side-nav__item.active .side-nav__glow {
  background:
    linear-gradient(270deg, color-mix(in srgb, var(--accent-cyan) 55%, transparent), rgba(0,212,255,.08) 60%, transparent),
    linear-gradient(270deg, var(--accent-cyan), transparent) right center/3px 100% no-repeat;
}
</style>
