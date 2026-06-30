/**
 * KPI / 卡片基础数据源
 *   - kpi/仪表盘/迷你 KPI 的「基准值」，作为 runSim() 随机抖动的初始基线
 *   - 所有数值均为非 reactive 常量，由上层组件按需求 reactive/ref 化
 */
import type { CenterMiniKpi, DashboardKpi, GaugeValues } from './types';

/* ---------- 4 个核心 KPI ---------- */
export const BASE_KPI: DashboardKpi = {
  population: 1882.70, // 常住人口（万人）
  gdp: 30355.73,       // GDP（亿元）
  vehicles: 428.15,    // 在岗机动车（万辆）
  aqi: 32,             // 空气质量 AQI
};

/* ---------- 两张仪表盘初始值（0~1） ---------- */
export const BASE_GAUGES: GaugeValues = {
  traffic: 0.58,  // 道路拥堵指数
  cpu: 0.42,      // 算力占用
};

/* ---------- 中央浮层的三个迷你 KPI ---------- */
export const BASE_MINI_KPI: CenterMiniKpi = {
  alerts: 23,            // 今日警情
  devices: 28_492,       // 在线设备
  visitors: 186_305,     // 当前游客
};

/* ---------- 底栏倒计时刷新间隔（秒） ---------- */
export const REFRESH_TICK_START = 5;
