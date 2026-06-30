/**
 * 导航与配置相关常量数据（顶栏 / 侧栏 / 各类筛选器）
 *   纯静态常量，不含异步/随机逻辑；未来对接真实后端时，
 *   只需将对应模块替换为网络请求即可。
 */
import { markRaw } from 'vue';
import {
  IconHome, IconCar, IconLeaf, IconChart, IconSignal, IconCpu,
} from '@/components/ui/icons';
import type { FilterOption, TopNavMockItem } from './types';

/* ---------- 顶栏 Tab 列表（6 个一级业务域）
 * 注意：icon 是 Vue 组件对象，必须用 markRaw() 包裹，
 *      避免将来被 ref/reactive/shallowReactive 深代理后触发：
 *      [Vue warn]: Vue received a Component that was made a reactive object
 */
export const TOP_NAV_ITEMS: TopNavMockItem[] = [
  { key: 'overview',    label: '总览指挥', icon: markRaw(IconHome) },
  { key: 'traffic',     label: '交通运行', icon: markRaw(IconCar),  badge: 3 },
  { key: 'environment', label: '环境监测', icon: markRaw(IconLeaf) },
  { key: 'economy',     label: '经济运行', icon: markRaw(IconChart) },
  { key: 'security',    label: '公共安全', icon: markRaw(IconSignal), badge: 12 },
  { key: 'infra',       label: '城市基建', icon: markRaw(IconCpu) },
];

/* ---------- 区域人口分布 · 维度筛选 ---------- */
export const REGION_FILTER_OPTIONS: FilterOption[] = [
  { label: '人口', value: 'pop' },
  { label: 'GDP',  value: 'gdp' },
  { label: '车辆', value: 'car' },
];

/* ---------- 中央 3D 地图 · 图层筛选 ---------- */
export const MAP_FILTER_OPTIONS: FilterOption[] = [
  { label: '人口热力', value: 'people' },
  { label: '交通流量', value: 'traffic' },
  { label: '监控分布', value: 'camera' },
  { label: '事件告警', value: 'alert' },
];

/* ---------- 默认选中项（便于 App.vue 直接用，保持单例一致） ---------- */
export const DEFAULT_REGION_FILTER = 'pop';
export const DEFAULT_MAP_FILTER = 'people';
export const DEFAULT_TOP_TAB = 'overview';
