/**
 * Canvas 图表通用工具：
 *   - HiDPI 缩放（devicePixelRatio 处理）
 *   - 颜色插值、渐变构造
 *   - 文字测量、安全截断
 */
import { palette } from './theme';

export function setupHiDPI(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): { ctx: CanvasRenderingContext2D; dpr: number; w: number; h: number } {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, dpr, w: width, h: height };
}

/** 线性渐变：水平方向 */
export function linearGradient(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  stops: Array<[number, string]>,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([pos, color]) => g.addColorStop(pos, color));
  return g;
}

/** 径向渐变 */
export function radialGradient(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r0: number, r1: number,
  stops: Array<[number, string]>,
): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  stops.forEach(([pos, color]) => g.addColorStop(pos, color));
  return g;
}

/** 颜色插值（#RRGGBB + #RRGGBB -> 新颜色） */
export function mixColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

/** 颜色 -> rgba */
export function rgba(hex: string, alpha = 1): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function parseHex(c: string): [number, number, number] {
  const s = c.replace('#', '').trim();
  const full = s.length === 3 ? s.split('').map((ch) => ch + ch).join('') : s;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 文字带省略号截断测量 */
export function measureTruncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  ellipsis = '…',
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  let res = '';
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) {
      res = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res || text.slice(0, 1) + ellipsis;
}

/** 主色板默认，保证长度足够 */
export function defaultColors(n: number, override?: string[]): string[] {
  const base = override?.length ? override : palette.paletteChart;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

/** 计算坐标轴 nice 步长 */
export function niceScale(min: number, max: number, ticks = 5): { min: number; max: number; step: number } {
  if (min === max) {
    const pad = Math.max(1, Math.abs(max) * 0.1 || 1);
    return { min: min - pad, max: max + pad, step: (2 * pad) / ticks };
  }
  const range = max - min;
  const rawStep = range / (ticks || 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step: number;
  if (norm <= 1) step = 1;
  else if (norm <= 2) step = 2;
  else if (norm <= 5) step = 5;
  else step = 10;
  step *= mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  return { min: niceMin, max: niceMax, step };
}
