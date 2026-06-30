/**
 * 响应式 / 通用 Hooks
 */
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { breakpoints } from './theme';

/* ---------- 尺寸观察：基于 ResizeObserver 实时返回尺寸 ---------- */
export function useResize(
  elRef: Ref<HTMLElement | null | undefined>,
  onResize?: (size: { width: number; height: number }) => void,
) {
  const width = ref(0);
  const height = ref(0);
  let ro: ResizeObserver | null = null;

  const setup = () => {
    const el = elRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    width.value = rect.width;
    height.value = rect.height;
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { clientWidth, clientHeight } = entry.target as HTMLElement;
        width.value = clientWidth;
        height.value = clientHeight;
        onResize?.({ width: clientWidth, height: clientHeight });
      }
    });
    ro.observe(el);
  };

  onMounted(setup);
  onBeforeUnmount(() => {
    ro?.disconnect();
    ro = null;
  });
  // 允许 elRef 后续变化（v-if 场景）
  watch(
    () => elRef.value,
    (n, o) => {
      if (n && n !== o) {
        ro?.disconnect();
        setup();
      } else if (!n) {
        ro?.disconnect();
      }
    },
  );

  return { width, height };
}

/* ---------- 大屏断点判断 ---------- */
export function useBreakpoint() {
  const tier = ref<'fhd' | 'qhd' | 'uhd'>('fhd');
  const update = () => {
    const w = window.innerWidth;
    if (w >= breakpoints.uhd) tier.value = 'uhd';
    else if (w >= breakpoints.qhd) tier.value = 'qhd';
    else tier.value = 'fhd';
  };
  onMounted(() => {
    update();
    window.addEventListener('resize', update);
  });
  onBeforeUnmount(() => window.removeEventListener('resize', update));
  return { tier };
}

/* ---------- 数字滚动动画（基于 requestAnimationFrame） ---------- */
/**
 * @param target 目标数值 Ref
 * @param duration ms
 */
export function useAnimatedNumber(
  target: Ref<number>,
  duration = 800,
  easing: (t: number) => number = easeOutCubic,
) {
  const current = ref<number>(target.value);
  let rafId = 0;
  let startTs = 0;
  let from = target.value;

  const animate = (ts: number) => {
    if (!startTs) startTs = ts;
    const t = Math.min(1, (ts - startTs) / duration);
    current.value = from + (target.value - from) * easing(t);
    if (t < 1) rafId = requestAnimationFrame(animate);
  };

  watch(
    target,
    (_v, oldV) => {
      cancelAnimationFrame(rafId);
      startTs = 0;
      from = typeof oldV === 'number' ? oldV : current.value;
      rafId = requestAnimationFrame(animate);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => cancelAnimationFrame(rafId));
  return { current };
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/* ---------- 数字/百分比格式化 ---------- */
export const fmt = {
  integer(v: number): string {
    return Math.round(v).toLocaleString('zh-CN');
  },
  decimal(v: number, digits = 1): string {
    return v.toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  },
  percent(v: number, digits = 1): string {
    return `${(v * 100).toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}%`;
  },
  /** 1234 -> 1.2k, 1.5w */
  compact(v: number, digits = 1): string {
    const abs = Math.abs(v);
    if (abs >= 10000) return `${(v / 10000).toFixed(digits)}万`;
    if (abs >= 1000) return `${(v / 1000).toFixed(digits)}k`;
    return String(Math.round(v));
  },
  /** 格式化为 HH:MM:SS */
  hhmmss(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
  },
  /** YYYY-MM-DD HH:MM:SS */
  date(ts: number): string {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
      d.getHours(),
    )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },
};

/* ---------- 节流 ---------- */
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): T {
  let pending = false;
  let lastArgs: Parameters<T> | null = null;
  return ((...args: Parameters<T>) => {
    lastArgs = args;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (lastArgs) fn(...lastArgs);
    });
  }) as T;
}
