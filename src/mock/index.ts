/**
 * Mock 数据统一出口
 *   组件只需要从 `@/mock` 一处导入即可，无需关心内部子模块划分
 *
 * 两种使用方式（均已导出）：
 *   1) 异步接口（推荐，与真实后端同形）：
 *        import { mockApi } from '@/mock';
 *        const data = await mockApi.fetchDashboardSnapshot();
 *
 *   2) 直接取静态常量 / 工厂函数（用于对首屏延迟敏感的场景）：
 *        import { BASE_KPI, TOP_NAV_ITEMS } from '@/mock';
 */

/* ---------- 1) 异步 / 模拟服务 ---------- */
export { default as mockApi } from './mockApi';
export * from './mockApi';

/* ---------- 2) 纯常量 / 工厂函数（按模块分组聚合） ---------- */
// 导航 / 筛选器
export {
  TOP_NAV_ITEMS,
  REGION_FILTER_OPTIONS,
  MAP_FILTER_OPTIONS,
  DEFAULT_TOP_TAB,
  DEFAULT_REGION_FILTER,
  DEFAULT_MAP_FILTER,
} from './navigation';

// KPI / 仪表 / 迷你 KPI 基准值
export {
  BASE_KPI,
  BASE_GAUGES,
  BASE_MINI_KPI,
  REFRESH_TICK_START,
} from './kpi';

// 图表
export {
  REGION_BAR_DATA,
  GDP_SECTORS,
  HEATMAP_ROWS,
  HEATMAP_COLS,
  buildHeatmapData,
} from './charts';

// 区域地图 / 事件 / 预警
export {
  REGION_MAP_DATA,
  DEFAULT_SELECTED_REGION,
  REGION_NAME_TO_ID,
  buildTimelineEvents,
  defaultTimelineCurrent,
  TICKER_LIST,
} from './geo-and-events';

// 类型
export * from './types';
