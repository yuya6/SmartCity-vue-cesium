// 实时数据 KPI 卡片
<template>
  <div class="kpi-card smart-card" :class="[`kpi-card--${accent}`, sizeClass]" :style="cardStyle">
    <!-- 装饰边角 -->
    <span class="kpi-card__corner kpi-card__corner--tl"></span>
    <span class="kpi-card__corner kpi-card__corner--br"></span>

    <div class="kpi-card__head">
      <div v-if="$slots.icon" class="kpi-card__icon">
        <slot name="icon" />
      </div>
      <div class="kpi-card__label">{{ label }}</div>
    </div>

    <div class="kpi-card__value-row">
      <span class="kpi-card__value mono" :class="{ tabular: tabularNums }">
        {{ display }}
      </span>
      <span
        v-if="unit"
        class="kpi-card__unit"
        :class="`kpi-card__unit--${unitPosition}`"
      >{{ unit }}</span>
    </div>

    <div v-if="trend" class="kpi-card__trend" :class="`kpi-card__trend--${trend.direction}`">
      <component :is="trendIcon" size="14" />
      <span class="kpi-card__trend-value">{{ trend.value }}</span>
      <span v-if="trend.caption" class="kpi-card__trend-caption text-tertiary">{{ trend.caption }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * KpiCard — 实时数据 KPI 卡片
 * -----------------------------------------------------------
 * Props: KpiCardProps
 *  - animateNumber: 数字从 0 滚动至目标值（默认 true）
 *  - tabularNums: 等宽数字（默认 true，保证 KPI 对齐不跳动）
 *  - unitPosition: 单位位置（right / top-right / bottom-right）
 *  - 颜色方案：accent (semantic) 或自定义 color
 *
 * Events:
 *  @click: 卡片点击（进入下钻）
 */
import { computed, ref, watch } from 'vue';
import { useAnimatedNumber, fmt } from '../shared/hooks';
import type { KpiCardProps } from '../shared/types';
import { IconArrowUp, IconArrowDown, IconMinus } from '../ui/icons';

const props = withDefaults(defineProps<KpiCardProps>(), {
  animateNumber: true,
  tabularNums: true,
  animationDuration: 900,
  unitPosition: 'right',
  accent: 'primary',
  size: 'md',
});

defineEmits<{ (e: 'click', e2: MouseEvent): void }>();

const sizeClass = computed(() => `kpi-card--${props.size}`);

const rawNum = ref<number>(typeof props.value === 'number' ? props.value : 0);
watch(
  () => props.value,
  (v) => { if (typeof v === 'number') rawNum.value = v; },
);
const animated = useAnimatedNumber(rawNum, props.animationDuration);

const display = computed(() => {
  if (typeof props.value === 'string') return props.value;
  const v = props.animateNumber ? animated.current.value : props.value as number;
  if (Number.isInteger(props.value as number)) return fmt.integer(v);
  return fmt.decimal(v, 1);
});

const cardStyle = computed(() => {
  if (!props.color) return {};
  return {
    '--kpi-color': props.color,
    '--kpi-shadow': `0 0 18px ${props.color}55, 0 0 40px ${props.color}22`,
  } as Record<string, string>;
});

const trendIcon = computed(() => {
  switch (props.trend?.direction) {
    case 'up': return IconArrowUp;
    case 'down': return IconArrowDown;
    default: return IconMinus;
  }
});
</script>

<style scoped lang="css">
.kpi-card {
  --kpi-color: var(--accent-cyan);
  --kpi-shadow: var(--glow-cyan);
  position: relative;
  padding: 14px 18px 16px;
  background:
    linear-gradient(180deg, rgba(14, 22, 60, 0.9) 0%, rgba(10, 16, 46, 0.75) 100%);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, border-color .2s;
  cursor: pointer;
}
.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--kpi-color);
  box-shadow: var(--kpi-shadow);
}
.kpi-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, var(--kpi-color) 12%, transparent) 0%, transparent 60%);
  pointer-events: none;
}
.kpi-card__corner {
  position: absolute; width: 10px; height: 10px;
  border: 1px solid var(--kpi-color);
  pointer-events: none;
}
.kpi-card__corner--tl { top: 0; left: 0; border-right: 0; border-bottom: 0; }
.kpi-card__corner--br { bottom: 0; right: 0; border-left: 0; border-top: 0; }

.kpi-card--primary    { --kpi-color: var(--accent-cyan);   --kpi-shadow: var(--glow-cyan); }
.kpi-card--success    { --kpi-color: var(--color-success); --kpi-shadow: var(--glow-success); }
.kpi-card--warning    { --kpi-color: var(--color-warning); --kpi-shadow: var(--glow-warning); }
.kpi-card--danger     { --kpi-color: var(--color-danger);  --kpi-shadow: var(--glow-danger); }
.kpi-card--info       { --kpi-color: var(--color-info);    --kpi-shadow: 0 0 18px rgba(69,167,255,.35); }

.kpi-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--text-secondary);
}
.kpi-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 26px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--kpi-color) 18%, transparent);
  color: var(--kpi-color);
  border: 1px solid color-mix(in srgb, var(--kpi-color) 35%, transparent);
}
.kpi-card__label {
  font-size: 0.8rem;
  letter-spacing: .1em;
  color: var(--text-secondary);
}

.kpi-card__value-row {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.kpi-card__value {
  color: var(--kpi-color);
  font-weight: 700;
  line-height: 1;
  letter-spacing: .02em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--kpi-color) 70%, transparent);
  font-variant-numeric: tabular-nums;
}
.kpi-card--sm .kpi-card__value { font-size: 1.8rem; }
.kpi-card--md .kpi-card__value { font-size: 2.4rem; }
.kpi-card--lg .kpi-card__value { font-size: 3rem; }
.kpi-card__unit {
  color: var(--text-secondary);
  font-size: 0.75rem;
  letter-spacing: .06em;
}
.kpi-card__unit--top-right {
  position: absolute; top: 0; right: 0;
}
.kpi-card__unit--bottom-right {
  align-self: flex-end;
}

.kpi-card__trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  font-size: 0.75rem;
  letter-spacing: .02em;
  font-family: 'JetBrains Mono', monospace;
}
.kpi-card__trend--up   { color: var(--color-success); }
.kpi-card__trend--down { color: var(--color-danger); }
.kpi-card__trend--flat { color: var(--text-secondary); }
.kpi-card__trend-value { font-weight: 600; }
.kpi-card__trend-caption { margin-left: 6px; font-family: 'Inter', sans-serif; }
</style>
