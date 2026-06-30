/**
 * 区域地图 / 时间轴 / 预警滚动条
 *   - 区县地图数据与 RegionMap 组件消费对齐
 *   - 时间轴事件基于调用时刻动态生成（相对今日偏移）
 */
import type { RegionRecord, TickerItem, TimelineMockEvent } from './types';

/* ---------- 广州 11 区县人口（人）—— SVG 地图热力 ---------- */
export const REGION_MAP_DATA: RegionRecord[] = [
  { id: 'tianhe',    name: '天河区', value: 2284000 },
  { id: 'yuexiu',    name: '越秀区', value: 1802000 },
  { id: 'haizhu',    name: '海珠区', value: 1718000 },
  { id: 'liwan',     name: '荔湾区', value: 1093000 },
  { id: 'baiyun',    name: '白云区', value: 3748000 },
  { id: 'huangpu',   name: '黄埔区', value: 1198000 },
  { id: 'panyu',     name: '番禺区', value: 2823000 },
  { id: 'huadu',     name: '花都区', value: 1708000 },
  { id: 'zengcheng', name: '增城区', value: 1560000 },
  { id: 'nansha',    name: '南沙区', value: 940000 },
  { id: 'conghua',   name: '从化区', value: 741000 },
];

/* ---------- 默认选中区县 id ---------- */
export const DEFAULT_SELECTED_REGION = 'tianhe';

/* ---------- 中文名 → id 映射（柱状图点击 → 地图联动） ---------- */
export const REGION_NAME_TO_ID: Record<string, string> = {
  天河区: 'tianhe',  越秀区: 'yuexiu',   海珠区: 'haizhu',   番禺区: 'panyu',
  白云区: 'baiyun',  黄埔区: 'huangpu',  荔湾区: 'liwan',    花都区: 'huadu',
  增城区: 'zengcheng', 南沙区: 'nansha', 从化区: 'conghua',
};

/**
 * 构建「今日事件」时间轴数据：以传入基准时间为锚点按相对小时偏移
 *   每次调用基于 nowTs 生成，保证每次进入页面都相对于「现在」。
 */
export function buildTimelineEvents(nowTs = Date.now()): TimelineMockEvent[] {
  const h = 3_600_000;
  return [
    { time: nowTs - 9 * h, title: '早高峰启动 · 珠江新城 4.2 级拥堵', status: 'warning', description: '交通大脑自动派发信号优化策略' },
    { time: nowTs - 6 * h, title: '白云机场 T2 客流达到峰值',          status: 'info',    description: '小时吞吐量 1.8 万人次' },
    { time: nowTs - 4 * h, title: '番禺区突发 1 级雷暴预警',           status: 'danger',  description: '应急联动：12 条地铁线路启动预案' },
    { time: nowTs - 3 * h, title: '琶洲展会周边客流 12.6 万',          status: 'warning' },
    { time: nowTs - 1 * h, title: '电力调度峰值平衡完成',              status: 'success', description: '全区用电负荷 1027 万千瓦' },
    { time: nowTs,         title: '广州塔光锥启动 · 指挥大屏上线',      status: 'primary', description: '系统自检通过，所有数据源接入正常' },
  ];
}

/* ---------- 默认时间轴游标（当前时间往前 3 小时） ---------- */
export function defaultTimelineCurrent(nowTs = Date.now()): number {
  return nowTs - 3 * 3_600_000;
}

/* ---------- 底栏预警滚动条 ---------- */
export const TICKER_LIST: TickerItem[] = [
  '【预警】番禺区 22:15 短时强降雨 42mm/h，已启动排水联动',
  '【提示】天河路-体育西路车流同比 +18%，建议绕行珠江新城隧道',
  '【联动】白云山索道旅客 3.1 万人/小时，已开启疏导广播',
  '【通报】南沙港四期自动化码头吞吐量创新高 4.8 万 TEU/日',
];
