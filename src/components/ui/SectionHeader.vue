<template>
  <div class="section-header" :class="`section-header--${size}`">
    <span class="section-header__bar" :style="barStyle"></span>
    <h3 class="section-header__title">
      <slot name="icon" />
      <span class="section-header__text">{{ title }}</span>
      <slot />
    </h3>
    <div v-if="$slots.extra" class="section-header__extra">
      <slot name="extra" />
    </div>
    <span class="section-header__line" />
  </div>
</template>

<script setup lang="ts">
/**
 * SectionHeader — 面板标题头，左侧发光竖条 + 标题 + 右侧可选拓展插槽
 * Props:
 *  - title: 标题文字
 *  - size:  'sm' | 'md' | 'lg'
 *  - color: 自定义 accent 色
 */
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  title: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}>(), { size: 'md' });

const barStyle = computed(() => {
  if (!props.color) return;
  return { background: props.color, boxShadow: `0 0 10px ${props.color}` };
});
</script>

<style scoped lang="css">
.section-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0 10px;
  margin-bottom: 8px;
  border-bottom: 1px dashed var(--border-subtle);
}
.section-header__bar {
  display: inline-block;
  width: 3px;
  height: 60%;
  background: linear-gradient(180deg, var(--accent-cyan), var(--accent-cyan-deep));
  box-shadow: 0 0 10px var(--accent-cyan);
  border-radius: 2px;
  align-self: stretch;
  margin-top: 6%;
}
.section-header__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary);
  letter-spacing: .1em;
  font-weight: 600;
  line-height: 1;
  flex: 0 0 auto;
}
.section-header__text { white-space: nowrap; }
.section-header--sm .section-header__title { font-size: 0.9rem; }
.section-header--md .section-header__title { font-size: 1.05rem; }
.section-header--lg .section-header__title { font-size: 1.25rem; letter-spacing: .16em; }
.section-header__extra {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.section-header__line {
  display: none;
}
</style>
