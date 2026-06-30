/**
 * 组件懒加载入口：通过 defineAsyncComponent 实现组件级按需加载，
 * 减少首屏 JS 体积，提升大屏初始渲染速度。
 *
 * 示例使用：
 *   import { lazyLineChart } from '@/components/shared/lazy';
 *   const LineChart = lazyLineChart();
 */
import { defineAsyncComponent, type AsyncComponentLoader } from 'vue';

function lazyImport(loader: AsyncComponentLoader, delay = 60, timeout = 30000) {
  return defineAsyncComponent({
    loader,
    loadingComponent: undefined,
    delay,
    timeout,
    suspensible: true,
  });
}

/* ---------- 数据可视化图表 ---------- */
export const lazyLineChart = () =>
  lazyImport(() => import('../charts/LineChart.vue'));
export const lazyBarChart = () =>
  lazyImport(() => import('../charts/BarChart.vue'));
export const lazyPieChart = () =>
  lazyImport(() => import('../charts/PieChart.vue'));
export const lazyHeatmap = () =>
  lazyImport(() => import('../charts/Heatmap.vue'));
export const lazyGaugeCard = () =>
  lazyImport(() => import('../cards/GaugeCard.vue'));

/* ---------- 数据卡片 ---------- */
export const lazyKpiCard = () =>
  lazyImport(() => import('../cards/KpiCard.vue'));
export const lazyTrendCard = () =>
  lazyImport(() => import('../cards/TrendCard.vue'));

/* ---------- 基础 UI ---------- */
export const lazyStatusDot = () =>
  lazyImport(() => import('../ui/StatusDot.vue'));
export const lazyGlowText = () =>
  lazyImport(() => import('../ui/GlowText.vue'));
export const lazySectionHeader = () =>
  lazyImport(() => import('../ui/SectionHeader.vue'));
export const lazyDivider = () =>
  lazyImport(() => import('../ui/Divider.vue'));

/* ---------- 交互组件 ---------- */
export const lazyTimeline = () =>
  lazyImport(() => import('../interactive/Timeline.vue'));
export const lazyFilterChip = () =>
  lazyImport(() => import('../interactive/FilterChip.vue'));
export const lazyTopNav = () =>
  lazyImport(() => import('../interactive/TopNav.vue'));
export const lazySideNav = () =>
  lazyImport(() => import('../interactive/SideNav.vue'));

/* ---------- 地图 / 布局 ---------- */
export const lazyRegionMap = () =>
  lazyImport(() => import('../geo/RegionMap.vue'));
export const lazyDashboardLayout = () =>
  lazyImport(() => import('../layout/DashboardLayout.vue'));
