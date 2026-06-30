<template>
  <span
    class="glow-text"
    :class="[`glow-text--${accent}`, sizeClass]"
    :style="customStyle"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
/**
 * GlowText — 科技感发光文字
 * ------------------------------------------------
 * Props:
 *  - accent: 'primary' | 'success' | 'warning' | 'danger' | 'info'
 *  - size:   'sm' | 'md' | 'lg' | 'xl'
 *  - color:  自定义颜色（覆盖 accent）
 *  - glow:   是否启用发光（默认 true）
 */
import { computed } from 'vue';
import type { SemanticStatus } from '../shared/types';

const props = withDefaults(defineProps<{
  accent?: SemanticStatus | 'primary';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  glow?: boolean;
}>(), {
  accent: 'primary',
  size: 'md',
  glow: true,
});

const sizeClass = computed(() => `glow-text--${props.size}`);
const customStyle = computed(() => {
  const s: Record<string, string> = {};
  if (props.color) {
    s.color = props.color;
    if (props.glow) s.textShadow = `0 0 10px ${props.color}99, 0 0 22px ${props.color}55`;
  }
  return s;
});
</script>

<style scoped lang="css">
.glow-text {
  font-weight: 600;
  letter-spacing: 0.05em;
  transition: text-shadow .25s ease;
}
.glow-text--primary    { color: var(--accent-cyan);      text-shadow: 0 0 10px rgba(0,212,255,.6), 0 0 22px rgba(0,212,255,.3); }
.glow-text--success    { color: var(--color-success);    text-shadow: 0 0 10px rgba(0,255,136,.6), 0 0 22px rgba(0,255,136,.3); }
.glow-text--warning    { color: var(--color-warning);    text-shadow: 0 0 10px rgba(255,176,32,.6), 0 0 22px rgba(255,176,32,.3); }
.glow-text--danger     { color: var(--color-danger);     text-shadow: 0 0 12px rgba(255,77,79,.65), 0 0 24px rgba(255,77,79,.35); }
.glow-text--info       { color: var(--color-info);       text-shadow: 0 0 10px rgba(69,167,255,.55), 0 0 22px rgba(69,167,255,.3); }
.glow-text--sm { font-size: 0.75rem; }
.glow-text--md { font-size: 0.9rem; }
.glow-text--lg { font-size: 1.25rem; letter-spacing: .1em; font-weight: 700; }
.glow-text--xl { font-size: 1.6rem;  letter-spacing: .14em; font-weight: 700; }
</style>
