/**
 * Mock 数据通用类型 —— 保证所有导出与 App.vue 消费点类型对齐
 *   避免 any 的同时，也可以作为未来对接真实后端接口的契约参考
 */
import type { Component } from 'vue';
import type { SemanticStatus } from '@/components/shared/types';

/* ---------- 顶栏 & 侧栏 ---------- */
export interface TopNavMockItem {
  key: string;
  label: string;
  icon?: Component;
  badge?: number;
}

/* ---------- KPI 卡片 ---------- */
export interface DashboardKpi {
  population: number;  // 常住人口（万人）
  gdp: number;         // 地区生产总值（亿元）
  vehicles: number;    // 在岗机动车（万辆）
  aqi: number;         // 空气质量 AQI（μg/m³）
}

/* ---------- 图表通用 ---------- */
export interface LabelValueColor {
  label: string;
  value: number;
  color?: string;
}

/* ---------- 筛选器 ---------- */
export interface FilterOption<T extends string | number = string> {
  label: string;
  value: T;
}

/* ---------- 热力图（2D 网格） ---------- */
export interface HeatCell {
  row: string;
  col: string;
  value: number;
}

/* ---------- 区域地图 ---------- */
export interface RegionRecord {
  id: string;
  name: string;
  value: number;
}

/* ---------- 时间轴 ---------- */
export interface TimelineMockEvent {
  time: number;
  title: string;
  status?: SemanticStatus | 'primary';
  description?: string;
}

/* ---------- 中央浮层迷你 KPI ---------- */
export interface CenterMiniKpi {
  alerts: number;
  devices: number;
  visitors: number;
}

/* ---------- 仪表 ---------- */
export interface GaugeValues {
  traffic: number;   // 道路拥堵指数 0~1
  cpu: number;       // 算力占用 0~1
}

/* ---------- 底栏预警滚动条 ---------- */
export type TickerItem = string;
