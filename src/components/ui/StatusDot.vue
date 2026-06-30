<template>
  <span
    class="status-dot"
    :class="[
      `status-dot--${status}`,
      `status-dot--${size}`,
      { 'status-dot--pulse': pulse },
    ]"
    :style="customStyle"
    :aria-label="label || status"
    role="status"
  >
    <span class="status-dot__core"></span>
    <span v-if="label" class="status-dot__label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * StatusDot — 状态指示呼吸灯
 * ------------------------------------------------
 * Props:
 *   - status: SemanticStatus (success|warning|danger|info|primary)
 *   - size:   'sm' | 'md' | 'lg'
 *   - pulse:  是否启用呼吸动画
 *   - label:  旁侧文字
 *   - color:  自定义颜色
 */
import { computed } from 'vue';
import type { StatusDotProps } from '../shared/types';

const props = withDefaults(defineProps<StatusDotProps & { color?: string }>(), {
  status: 'info',
  size: 'md',
  pulse: true,
});

const customStyle = computed(() => {
  if (!props.color) return {};
  return {
    '--dot-color': props.color,
    '--dot-shadow': `0 0 10px ${props.color}, 0 0 24px ${props.color}66`,
  } as Record<string, string>;
});
</script>

<style scoped lang="css">
.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  --dot-color: var(--accent-cyan);
  --dot-shadow: var(--glow-cyan);
  --dot-size: 10px;
}
.status-dot--success    { --dot-color: var(--color-success); --dot-shadow: var(--glow-success); }
.status-dot--warning    { --dot-color: var(--color-warning); --dot-shadow: var(--glow-warning); }
.status-dot--danger     { --dot-color: var(--color-danger);  --dot-shadow: var(--glow-danger); }
.status-dot--info       { --dot-color: var(--color-info);    --dot-shadow: 0 0 10px rgba(69,167,255,.6); }
.status-dot--primary    { --dot-color: var(--accent-cyan);   --dot-shadow: var(--glow-cyan); }

.status-dot--sm { --dot-size: 6px; }
.status-dot--md { --dot-size: 10px; }
.status-dot--lg { --dot-size: 14px; }

.status-dot__core {
  position: relative;
  width: var(--dot-size);
  height: var(--dot-size);
  border-radius: 999px;
  background: var(--dot-color);
  box-shadow: var(--dot-shadow);
}
.status-dot--pulse .status-dot__core::before {
  content: '';
  position: absolute;
  inset: -40%;
  border-radius: 999px;
  background: var(--dot-color);
  opacity: .35;
  animation: status-dot-breath 1.8s ease-in-out infinite;
}
@keyframes status-dot-breath {
  0%,100% { transform: scale(0.8); opacity: .4; }
  50%     { transform: scale(1.6); opacity: .05; }
}

.status-dot__label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: .06em;
}
</style>
