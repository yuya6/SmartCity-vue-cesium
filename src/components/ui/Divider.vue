<template>
  <div
    class="divider"
    :class="[
      `divider--${direction}`,
      { 'divider--dashed': dashed, 'divider--glow': glow },
    ]"
    :role="role"
  >
    <span v-if="$slots.default" class="divider__label"><slot /></span>
  </div>
</template>

<script setup lang="ts">
/**
 * Divider — 科技感渐变分割线，支持带文字标签
 */
withDefaults(defineProps<{
  direction?: 'horizontal' | 'vertical';
  dashed?: boolean;
  glow?: boolean;
  role?: string;
}>(), {
  direction: 'horizontal',
  dashed: false,
  glow: true,
  role: 'separator',
});
</script>

<style scoped lang="css">
.divider {
  position: relative;
  pointer-events: none;
}
.divider--horizontal {
  width: 100%;
  height: 1px;
  margin: 12px 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--border-subtle) 20%,
    var(--accent-cyan) 50%,
    var(--border-subtle) 80%,
    transparent 100%
  );
  opacity: .9;
}
.divider--glow.divider--horizontal {
  box-shadow: 0 0 6px rgba(0,212,255,.25);
}
.divider--dashed.divider--horizontal {
  background: none;
  height: 0;
  border-top: 1px dashed var(--border-subtle);
}
.divider--vertical {
  width: 1px;
  align-self: stretch;
  background: linear-gradient(180deg, transparent, var(--accent-cyan) 50%, transparent);
  opacity: .7;
}
.divider__label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-panel, #0C1230);
  padding: 0 12px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  letter-spacing: .15em;
}
</style>
