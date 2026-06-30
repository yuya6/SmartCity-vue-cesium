<template>
  <div
    class="filter-chip"
    :class="[`filter-chip--${size}`, { 'filter-chip--multiple': multiple }]"
    role="toolbar"
  >
    <span v-if="$slots.prefix" class="filter-chip__prefix"><slot name="prefix" /></span>
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="filter-chip__btn"
      :class="{
        'is-active': isSelected(opt),
        'is-disabled': !!opt.disabled,
      }"
      :disabled="opt.disabled"
      :aria-pressed="isSelected(opt)"
      @pointerdown="toggle(opt)"
    >
      {{ opt.label }}
    </button>
    <span v-if="$slots.suffix" class="filter-chip__suffix"><slot name="suffix" /></span>
  </div>
</template>

<script setup lang="ts">
/**
 * FilterChip — 胶囊筛选器（单选 / 多选）
 *   Props: FilterChipProps
 *   v-model 支持 T | T[]（根据 multiple）
 */
import type { FilterChipProps, FilterOption } from '../shared/types';

type ChipValue = string | number;
const props = withDefaults(
  defineProps<FilterChipProps<ChipValue>>(),
  {
    multiple: false,
    allowClear: true,
    size: 'md',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: ChipValue | ChipValue[] | undefined): void;
  (e: 'change', v: ChipValue | ChipValue[] | undefined, opt: FilterOption<ChipValue>): void;
}>();

function isSelected(opt: FilterOption<ChipValue>) {
  const cur = props.modelValue;
  if (props.multiple) {
    return Array.isArray(cur) && (cur as ChipValue[]).includes(opt.value);
  }
  return cur === opt.value;
}

function toggle(opt: FilterOption<ChipValue>) {
  if (opt.disabled) return;
  if (props.multiple) {
    const cur = Array.isArray(props.modelValue) ? [...(props.modelValue as ChipValue[])] : [];
    const idx = cur.indexOf(opt.value);
    if (idx >= 0) cur.splice(idx, 1);
    else cur.push(opt.value);
    emit('update:modelValue', cur);
    emit('change', cur, opt);
  } else {
    const cur = props.modelValue;
    const next = (cur === opt.value && props.allowClear) ? undefined : opt.value;
    emit('update:modelValue', next);
    emit('change', next, opt);
  }
}

// 给父组件使用的便利方法
defineExpose({
  clear: () => emit('update:modelValue', props.multiple ? [] : undefined),
});
</script>

<style scoped lang="css">
.filter-chip {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  background: rgba(14,22,60,.4);
}
.filter-chip__btn {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  padding: 6px 14px;
  border-radius: 16px;
  letter-spacing: .06em;
  cursor: pointer;
  transition: all .2s ease;
  font-family: inherit;
}
.filter-chip__btn:hover:not(.is-disabled) {
  color: var(--text-primary);
  background: rgba(0,212,255,.08);
}
.filter-chip__btn.is-active {
  color: var(--text-primary);
  background: linear-gradient(90deg, var(--accent-cyan-deep), var(--accent-cyan));
  box-shadow: 0 0 12px rgba(0,212,255,.45);
  font-weight: 600;
}
.filter-chip__btn.is-disabled {
  opacity: .45;
  cursor: not-allowed;
}
.filter-chip--sm .filter-chip__btn { padding: 4px 10px; font-size: 0.72rem; }
.filter-chip--lg .filter-chip__btn { padding: 8px 18px; font-size: 0.9rem; }
.filter-chip__prefix, .filter-chip__suffix {
  color: var(--text-tertiary);
  font-size: 0.75rem;
  padding: 0 6px;
}
</style>
