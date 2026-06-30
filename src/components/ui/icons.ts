/**
 * 轻量内联 SVG 图标库，zero-dependency
 * 每个图标返回 SVG viewBox="0 0 24 24"，外层通过 currentColor 取色、font-size 控尺寸。
 * 使用：
 *   import { IconArrowUp } from '@/components/ui/icons';
 *   <component :is="IconArrowUp" />
 */
import { h, type Component } from 'vue';

/* ---------- 辅助：构造 SFC-Like 图标组件 ---------- */
function svg(
  paths: Array<{ d: string; stroke?: boolean; fill?: boolean; 'stroke-width'?: number; 'stroke-linecap'?: string; 'stroke-linejoin'?: string }>,
  size = 20,
): Component {
  return {
    name: 'SmartIcon',
    props: {
      size: { type: [Number, String], default: size },
      color: { type: String, default: 'currentColor' },
      strokeWidth: { type: Number, default: 1.75 },
    },
    setup(props) {
      return () =>
        h(
          'svg',
          {
            width: props.size,
            height: props.size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: props.color,
            'stroke-width': props.strokeWidth,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            style: { display: 'inline-block', verticalAlign: '-0.15em', overflow: 'visible' },
          },
          paths.map((p, i) => {
            const attrs: Record<string, unknown> = { ...p };
            if (p.fill) {
              attrs.fill = props.color;
              attrs.stroke = 'none';
            } else if (p.stroke) {
              attrs.stroke = props.color;
              attrs.fill = 'none';
            } else {
              attrs.fill = 'none';
              attrs.stroke = props.color;
            }
            delete (attrs as Partial<typeof p>).d;
            return h('path', { key: i, d: p.d, ...attrs });
          }),
        );
    },
  };
}

/* ---------- 常用图标 ---------- */
export const IconArrowUp = svg([
  { d: 'M12 19V5', stroke: true },
  { d: 'M5 12l7-7 7 7', stroke: true },
]);
export const IconArrowDown = svg([
  { d: 'M12 5v14', stroke: true },
  { d: 'M19 12l-7 7-7-7', stroke: true },
]);
export const IconArrowRight = svg([
  { d: 'M5 12h14', stroke: true },
  { d: 'M13 5l7 7-7 7', stroke: true },
]);
export const IconMinus = svg([{ d: 'M5 12h14', stroke: true }]);
export const IconCheck = svg([{ d: 'M20 6L9 17l-5-5', stroke: true }]);
export const IconWarning = svg([
  { d: 'M12 9v4', stroke: true },
  { d: 'M12 17h.01', stroke: true },
  { d: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', stroke: true },
]);
export const IconClock = svg([
  { d: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z', stroke: true },
  { d: 'M12 6v6l4 2', stroke: true },
]);
export const IconUsers = svg([
  { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', stroke: true },
  { d: 'M9 11a4 4 0 100-8 4 4 0 000 8z', stroke: true },
  { d: 'M23 21v-2a4 4 0 00-3-3.87', stroke: true },
  { d: 'M16 3.13a4 4 0 010 7.75', stroke: true },
]);
export const IconMapPin = svg([
  { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z', stroke: true },
  { d: 'M12 13a3 3 0 100-6 3 3 0 000 6z', stroke: true },
]);
export const IconActivity = svg([
  { d: 'M22 12h-4l-3 9L9 3l-3 9H2', stroke: true },
]);
export const IconSignal = svg([
  { d: 'M2 20h.01', stroke: true },
  { d: 'M7 20v-4', stroke: true },
  { d: 'M12 20v-8', stroke: true },
  { d: 'M17 20V8', stroke: true },
  { d: 'M22 4v16', stroke: true },
]);
export const IconFilter = svg([
  { d: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z', stroke: true },
]);
export const IconMenu = svg([
  { d: 'M3 12h18', stroke: true },
  { d: 'M3 6h18', stroke: true },
  { d: 'M3 18h18', stroke: true },
]);
export const IconHome = svg([
  { d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', stroke: true },
  { d: 'M9 22V12h6v10', stroke: true },
]);
export const IconChart = svg([
  { d: 'M3 3v18h18', stroke: true },
  { d: 'M7 16l4-4 4 4 5-5', stroke: true },
]);
export const IconBuilding = svg([
  { d: 'M3 21h18', stroke: true },
  { d: 'M5 21V7l8-4v18', stroke: true },
  { d: 'M19 21V11l-6-4', stroke: true },
  { d: 'M9 9v.01M9 13v.01M9 17v.01M13 9v.01M13 13v.01M13 17v.01', stroke: true },
]);
export const IconCar = svg([
  { d: 'M5 17h14l-1.5-4.5A2 2 0 0015.6 11H8.4a2 2 0 00-1.9 1.5L5 17z', stroke: true },
  { d: 'M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z', stroke: true },
  { d: 'M5 17v4M19 17v4', stroke: true },
]);
export const IconLeaf = svg([
  { d: 'M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19.2 2.5c1.5 3.3-.82 7-3.2 9.3-1.1 1.06-2.23 1.87-3.5 2.7', stroke: true },
  { d: 'M2 21c2-3 4-5 9-9', stroke: true },
]);
export const IconSun = svg([
  { d: 'M12 17a5 5 0 100-10 5 5 0 000 10z', stroke: true },
  { d: 'M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4', stroke: true },
]);
export const IconCloud = svg([
  { d: 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z', stroke: true },
]);
export const IconPlay = svg([
  { d: 'M6 4l15 8-15 8V4z', fill: true, stroke: false },
]);
export const IconPause = svg([
  { d: 'M6 4h4v16H6zM14 4h4v16h-4z', fill: true, stroke: false },
]);
export const IconCpu = svg([
  { d: 'M4 4h16v16H4z', stroke: true },
  { d: 'M9 9h6v6H9z', stroke: true },
  { d: 'M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3', stroke: true },
]);
export const IconWifi = svg([
  { d: 'M5 12.55a11 11 0 0114 0', stroke: true },
  { d: 'M1.42 9a16 16 0 0121.16 0', stroke: true },
  { d: 'M8.53 16.11a6 6 0 016.95 0', stroke: true },
  { d: 'M12 20h.01', stroke: true },
]);
