/**
 * 大屏控件库通用类型定义
 */
import type { CSSProperties, Ref } from 'vue';

/* ---------- 通用 ---------- */
export type SemanticStatus = 'success' | 'warning' | 'danger' | 'info' | 'primary';

export interface SizeVariant {
  /** 紧凑 / 正常 / 大 */
  size?: 'sm' | 'md' | 'lg';
}

/* ---------- 图表通用 ---------- */
export interface ChartBaseProps extends SizeVariant {
  /** 数据（组件内部 watch，变化时重绘） */
  data?: unknown[];
  /** 宽度（支持数字=px / 字符串 vw/vh/%） */
  width?: number | string;
  /** 高度（支持数字=px / 字符串 vw/vh/%） */
  height?: number | string;
  /** 自定义色板，覆盖默认 chart 调色板 */
  colors?: string[];
  /** 是否显示标题 */
  title?: string;
  /** 是否自动适配父容器尺寸（ResizeObserver） */
  autoResize?: boolean;
  /** 动画时长 ms，0 关闭 */
  animationDuration?: number;
  /** 背景样式 */
  backgroundStyle?: CSSProperties;
}

export interface LineChartPoint {
  /** X 轴标签或数值 */
  label: string | number;
  /** 单值模式 */
  value?: number;
  /** 多系列时用 seriesMap：seriesKey -> value */
  seriesMap?: Record<string, number>;
}

export interface LineChartProps extends ChartBaseProps {
  /** 单系列数据 */
  data?: LineChartPoint[];
  /** 多系列配置，提供名称 + 颜色 */
  series?: Array<{ key: string; label?: string; color?: string; dash?: boolean }>;
  /** 是否填充面积 */
  area?: boolean;
  /** 是否显示数值点 */
  dots?: boolean;
  /** Y 轴小数位 */
  yPrecision?: number;
}

export interface BarChartItem {
  label: string;
  value: number;
  /** 可选分组（多系列柱状图） */
  group?: string;
  color?: string;
}

export interface BarChartProps extends ChartBaseProps {
  data?: BarChartItem[];
  /** 'horizontal' 默认更适合大屏横向排名条 */
  direction?: 'horizontal' | 'vertical';
  /** 是否显示数值标签 */
  showLabels?: boolean;
  /** Y 轴小数位/数值格式 */
  yPrecision?: number;
  /** 条形渐变方向：从主色到深或到浅 */
  gradientMode?: 'soft' | 'strong';
}

export interface PieChartSlice {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps extends ChartBaseProps {
  data?: PieChartSlice[];
  /** 饼图 / 环形 */
  donut?: boolean;
  /** 环宽度占比（donut 模式） */
  donutRatio?: number;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 数值格式 */
  valueFormatter?: (v: number) => string;
}

export interface HeatmapCell {
  /** 行列键 */
  row: string;
  col: string;
  /** 数值 */
  value: number;
}

export interface HeatmapProps extends ChartBaseProps {
  data?: HeatmapCell[];
  /** 行顺序，缺省时根据 data 去重 */
  rows?: string[];
  cols?: string[];
  /** 颜色 stops，[value, color][] */
  colorStops?: Array<[number, string]>;
  /** 单元圆角 */
  cellRadius?: number;
  /** 悬停提示 */
  tooltip?: boolean;
}

/* ---------- KPI / 卡片 ---------- */
export type KpiTrend = 'up' | 'down' | 'flat';

export interface KpiCardProps extends SizeVariant {
  label: string;
  /** 数值，支持字符串/数字 */
  value: number | string;
  unit?: string;
  /** 环比/同比数值，如 "12.3%" */
  trend?: { direction: KpiTrend; value: string; caption?: string };
  /** 主色 */
  accent?: SemanticStatus | 'primary';
  /** 自定义色，覆盖 accent */
  color?: string;
  /** 是否动画数字滚动 */
  animateNumber?: boolean;
  /** 动画时长 ms */
  animationDuration?: number;
  /** 等宽数字（默认 true） */
  tabularNums?: boolean;
  /** 单位位置 */
  unitPosition?: 'right' | 'top-right' | 'bottom-right';
}

export interface GaugeCardProps {
  label: string;
  /** 0~1 */
  value: number;
  unit?: string;
  /** 刻度色带 stops（位置 0~1 -> 颜色） */
  stops?: Array<[number, string]>;
  size?: number;
  /** 动画时长 ms */
  animationDuration?: number;
  /** 中心显示的次要文字 */
  subText?: string;
}

/* ---------- 状态 / 指示 ---------- */
export interface StatusDotProps {
  /** 可选文字标签 */
  label?: string;
  /** 颜色语义 */
  status?: SemanticStatus;
  /** 是否显示呼吸动画 */
  pulse?: boolean;
  /** 尺寸 sm/md/lg */
  size?: 'sm' | 'md' | 'lg';
}

/* ---------- 时间轴 ---------- */
export interface TimelineEvent {
  /** 时间点（毫秒或刻度值） */
  time: number;
  /** 显示标题 */
  title: string;
  /** 可选描述 */
  description?: string;
  /** 颜色语义 */
  status?: SemanticStatus;
  /** 任意 payload */
  payload?: unknown;
}

export interface TimelineProps {
  events?: TimelineEvent[];
  /** 当前高亮时间（毫秒或刻度值） */
  current?: number;
  /** 是否可拖拽 */
  interactive?: boolean;
  /** 时间格式化 */
  timeFormatter?: (t: number) => string;
  /** 方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 标题文字 */
  title?: string;
  /** 宽度（数字 px 或 CSS 字符串，默认 100%） */
  width?: number | string;
  /** 高度（仅 horizontal 模式） */
  height?: number | string;
}

/* ---------- 筛选器 ---------- */
export interface FilterOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

export interface FilterChipProps<T = string | number> {
  options: FilterOption<T>[];
  modelValue?: T | T[];
  multiple?: boolean;
  /** 单选模式是否允许空 */
  allowClear?: boolean;
  /** 芯片尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/* ---------- 区域地图 ---------- */
export interface RegionMapItem {
  /** 区域 id，如 'tianhe' */
  id: string;
  /** 区域显示名 */
  name: string;
  /** 指标数值 */
  value: number;
}

export interface RegionMapProps {
  data?: RegionMapItem[];
  /** 颜色 stops */
  colorStops?: Array<[number, string]>;
  /** 选中区域 id */
  modelValue?: string;
  /** 是否显示 tooltip */
  tooltip?: boolean;
  /** 悬停高亮 */
  hoverable?: boolean;
}

/* ---------- 导出 / 入口 ---------- */
export interface ComponentPublicExports<T> {
  root: Ref<HTMLElement | undefined>;
  /** 刷新数据/重绘 */
  refresh: () => void;
  /** 销毁（释放 ResizeObserver 等） */
  dispose?: () => void;
  /** 内部数据 */
  getState?: () => T;
}
