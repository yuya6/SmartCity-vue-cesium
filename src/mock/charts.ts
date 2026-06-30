/**
 * 图表数据源：柱状图 / 饼图 / 热力图
 *   - 数据均为稳定的静态基准值（与原 App.vue 保持一致）
 *   - 热力图使用生成函数，每次调用返回相同分布，保证渲染稳定
 */
import type { HeatCell, LabelValueColor } from './types';
import type { BarChartItem } from '@/components/shared/types';

/* ---------- 广州 11 区县人口（万）—— 横向柱状图 ---------- */
export const REGION_BAR_DATA: BarChartItem[] = [
  { label: '天河区', value: 228.4 },
  { label: '越秀区', value: 180.2 },
  { label: '海珠区', value: 171.8 },
  { label: '番禺区', value: 282.3 },
  { label: '白云区', value: 374.8 },
  { label: '黄埔区', value: 119.8 },
  { label: '荔湾区', value: 109.3 },
  { label: '花都区', value: 170.8 },
  { label: '增城区', value: 156.0 },
  { label: '南沙区', value: 94.0 },
  { label: '从化区', value: 74.1 },
];

/* ---------- 行业经济结构 · 饼图（亿元） ---------- */
export const GDP_SECTORS: LabelValueColor[] = [
  { label: '信息技术', value: 8204, color: '#00D4FF' },
  { label: '先进制造', value: 6123, color: '#00FF88' },
  { label: '商贸服务', value: 5812, color: '#FFB020' },
  { label: '金融资本', value: 4205, color: '#B066FF' },
  { label: '交通物流', value: 2607, color: '#FF6EC7' },
  { label: '其他产业', value: 3404, color: '#45A7FF' },
];

/* ---------- 热力图行 / 列标签 ---------- */
export const HEATMAP_ROWS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const HEATMAP_COLS = Array.from({ length: 24 }, (_, i) => `${i}`.padStart(2, '0'));

/**
 * 生成 24h × 7天 客流密度热力矩阵（稳定数据，无随机）
 *   启发式：早晚高峰 + 周末中心商圈
 */
export function buildHeatmapData(): HeatCell[] {
  return HEATMAP_ROWS.flatMap((r, ri) =>
    HEATMAP_COLS.map((c, ci) => {
      const hour = ci;
      let base = 30 + Math.sin((hour - 8) / 24 * Math.PI * 2) * 25;
      if (hour >= 17 && hour <= 20) base += 25; // 晚高峰
      if (hour >= 7 && hour <= 9)   base += 15; // 早高峰
      if (ri >= 5)                  base += 10; // 周末
      const seed = (ri * 131 + ci * 37) % 100;
      return {
        row: r,
        col: c,
        value: Math.max(0, Math.round(base + (seed - 50) * 0.35)),
      };
    }),
  );
}
