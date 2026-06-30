/**
 * Mock 异步 API 封装
 *
 * 设计目标：让组件以 `await mockApi.fetchXxx()` 的形式调用，与真实后端接口保持同形，
 * 未来只需替换 fetch 内部实现即可无缝切换到真实服务，无需改动组件代码。
 *
 * - 所有函数都返回 Promise，并带一个可控的随机延迟（模拟网络抖动）
 * - 新增 `simulateTick()` 专门用于 5 秒定时器的「实时波动」逻辑，保持与原 runSim 行为一致
 */
import { BASE_GAUGES, BASE_KPI, BASE_MINI_KPI } from './kpi';
import { buildHeatmapData, GDP_SECTORS, REGION_BAR_DATA } from './charts';
import {
  buildTimelineEvents, defaultTimelineCurrent, REGION_MAP_DATA,
  REGION_NAME_TO_ID, DEFAULT_SELECTED_REGION, TICKER_LIST,
} from './geo-and-events';
import {
  DEFAULT_MAP_FILTER, DEFAULT_REGION_FILTER, DEFAULT_TOP_TAB,
  MAP_FILTER_OPTIONS, REGION_FILTER_OPTIONS, TOP_NAV_ITEMS,
} from './navigation';
import { REFRESH_TICK_START } from './kpi';
import type {
  CenterMiniKpi, DashboardKpi, FilterOption, GaugeValues,
  HeatCell, LabelValueColor, RegionRecord, TimelineMockEvent,
  TopNavMockItem,
} from './types';
import type { BarChartItem } from '@/components/shared/types';

/* ---------- 通用工具：可配置随机延迟 ---------- */
const DEFAULT_DELAY_MIN = 120;  // ms
const DEFAULT_DELAY_MAX = 420;  // ms
function delay(min = DEFAULT_DELAY_MIN, max = DEFAULT_DELAY_MAX) {
  const ms = min + Math.random() * (max - min);
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/* ================================================================
 *  接口 1：顶栏 & 筛选器配置
 * ==============================================================*/
export interface DashboardConfigs {
  topNavItems: TopNavMockItem[];
  regionFilterOptions: FilterOption[];
  mapFilterOptions: FilterOption[];
  defaults: {
    topTab: string;
    regionFilter: string;
    mapFilter: string;
  };
}

async function fetchDashboardConfigs(): Promise<DashboardConfigs> {
  await delay(60, 180);
  return {
    topNavItems: TOP_NAV_ITEMS,
    regionFilterOptions: REGION_FILTER_OPTIONS,
    mapFilterOptions: MAP_FILTER_OPTIONS,
    defaults: {
      topTab: DEFAULT_TOP_TAB,
      regionFilter: DEFAULT_REGION_FILTER,
      mapFilter: DEFAULT_MAP_FILTER,
    },
  };
}

/* ================================================================
 *  接口 2：KPI + 仪表盘 + 迷你 KPI
 * ==============================================================*/
export interface DashboardSnapshot {
  kpi: DashboardKpi;
  gauges: GaugeValues;
  mini: CenterMiniKpi;
  refreshTick: number;
}

async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  await delay();
  return {
    kpi: { ...BASE_KPI },
    gauges: { ...BASE_GAUGES },
    mini: { ...BASE_MINI_KPI },
    refreshTick: REFRESH_TICK_START,
  };
}

/* ================================================================
 *  接口 3：图表（柱状 + 饼 + 热力）
 * ==============================================================*/
export interface DashboardCharts {
  regionBar: BarChartItem[];
  gdpSectors: LabelValueColor[];
  heatmap: {
    rows: string[];
    cols: string[];
    data: HeatCell[];
  };
}

async function fetchDashboardCharts(): Promise<DashboardCharts> {
  await delay(100, 300);
  return {
    regionBar: REGION_BAR_DATA.map((d) => ({ ...d })),
    gdpSectors: GDP_SECTORS.map((d) => ({ ...d })),
    heatmap: {
      rows: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      cols: Array.from({ length: 24 }, (_, i) => `${i}`.padStart(2, '0')),
      data: buildHeatmapData(),
    },
  };
}

/* ================================================================
 *  接口 4：区域地图 + 事件时间轴 + 预警滚动条
 * ==============================================================*/
export interface DashboardGeoEvents {
  regions: RegionRecord[];
  defaultSelectedRegion: string;
  regionNameToId: Record<string, string>;
  events: TimelineMockEvent[];
  defaultEventCursor: number;
  tickers: string[];
}

async function fetchDashboardGeoEvents(nowTs = Date.now()): Promise<DashboardGeoEvents> {
  await delay(80, 220);
  return {
    regions: REGION_MAP_DATA.map((r) => ({ ...r })),
    defaultSelectedRegion: DEFAULT_SELECTED_REGION,
    regionNameToId: { ...REGION_NAME_TO_ID },
    events: buildTimelineEvents(nowTs),
    defaultEventCursor: defaultTimelineCurrent(nowTs),
    tickers: [...TICKER_LIST],
  };
}

/* ================================================================
 *  接口 5：模拟实时刷新（每次调用返回一次抖动结果）
 *    对应原 App.vue 中 runSim() 的行为，保持完全一致
 * ==============================================================*/
export interface DashboardTick extends DashboardSnapshot {
  // 实时刷新与一次 snapshot 结构相同，方便上层直接替换响应式值
}

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

function simulateTick(prev: DashboardSnapshot): DashboardTick {
  const kpi: DashboardKpi = {
    population: +(prev.kpi.population + (Math.random() - 0.45) * 0.02).toFixed(2),
    gdp:        +(prev.kpi.gdp + Math.random() * 0.8).toFixed(2),
    vehicles:   +(prev.kpi.vehicles + (Math.random() - 0.4) * 0.1).toFixed(2),
    aqi:        clamp(Math.round(prev.kpi.aqi + (Math.random() - 0.5) * 2), 18, 95),
  };
  const gauges: GaugeValues = {
    traffic: clamp(prev.gauges.traffic + (Math.random() - 0.5) * 0.04, 0.2, 0.95),
    cpu:     clamp(prev.gauges.cpu     + (Math.random() - 0.5) * 0.03, 0.15, 0.9),
  };
  const mini: CenterMiniKpi = {
    alerts:   clamp(Math.round(prev.mini.alerts + (Math.random() - 0.5) * 3), 8, 9999),
    devices:  prev.mini.devices + Math.round((Math.random() - 0.3) * 30),
    visitors: clamp(prev.mini.visitors + Math.round((Math.random() - 0.4) * 1800), 80_000, 10_000_000),
  };
  return {
    kpi,
    gauges,
    mini,
    refreshTick: prev.refreshTick <= 1 ? 5 : prev.refreshTick - 1,
  };
}

/* ================================================================
 *  聚合导出
 * ==============================================================*/
export const mockApi = {
  fetchDashboardConfigs,
  fetchDashboardSnapshot,
  fetchDashboardCharts,
  fetchDashboardGeoEvents,
  simulateTick,
};

export default mockApi;
