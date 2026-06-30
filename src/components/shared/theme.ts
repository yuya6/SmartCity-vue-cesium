/**
 * 智慧城市大屏主题 Tokens
 * ------------------------------------------------------------------
 * 采用深色科技蓝主题。所有组件应优先使用 CSS 变量以便运行时换肤，
 * 此处同时导出 JS 常量给 Canvas 图表等纯代码场景使用。
 */

/* ---------- 主题色板（JS 常量，Canvas / 脚本侧） ---------- */
export const palette = {
  /* 底色 */
  bgDeep: '#050816',      // 最底层背景
  bgPanel: '#0C1230',     // 面板底
  bgPanelAlt: '#111840',  // 交替面板底
  bgElevated: '#161E4A',  // 抬升面

  /* 边框 / 分割线 */
  borderSubtle: 'rgba(30, 60, 140, 0.45)',
  borderStrong: 'rgba(0, 212, 255, 0.35)',

  /* 主色（科技蓝） */
  primary: '#00D4FF',
  primarySoft: '#3DD9FF',
  primaryDeep: '#0078D4',

  /* 语义色 */
  success: '#00FF88',
  warning: '#FFB020',
  danger: '#FF4D4F',
  info: '#45A7FF',

  /* 辅助色（数据维度） */
  paletteChart: [
    '#00D4FF',
    '#00FF88',
    '#FFB020',
    '#FF4D4F',
    '#B066FF',
    '#FF6EC7',
    '#45A7FF',
    '#1AE1A8',
  ],

  /* 文字 */
  textPrimary: '#FFFFFF',
  textSecondary: '#8B9FD4',
  textTertiary: '#4E5D99',
};

/* ---------- 字体尺寸 / 间距（基于 100vw 大屏基准） ---------- */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const radius = {
  sm: '2px',
  md: '4px',
  lg: '8px',
};

/* ---------- 响应式断点（大屏分辨率） ---------- */
export const breakpoints = {
  // 1920×1080 及以下
  fhd: 1920,
  // 2K
  qhd: 2560,
  // 4K
  uhd: 3840,
};

/* ---------- CSS 变量注入字符串（注入到 :root 让组件直接消费） ---------- */
export const themeVariables = `
:root {
  --bg-deep: ${palette.bgDeep};
  --bg-panel: ${palette.bgPanel};
  --bg-panel-alt: ${palette.bgPanelAlt};
  --bg-elevated: ${palette.bgElevated};

  --border-subtle: ${palette.borderSubtle};
  --border-strong: ${palette.borderStrong};

  --accent-cyan: ${palette.primary};
  --accent-cyan-soft: ${palette.primarySoft};
  --accent-cyan-deep: ${palette.primaryDeep};

  --color-success: ${palette.success};
  --color-warning: ${palette.warning};
  --color-danger: ${palette.danger};
  --color-info: ${palette.info};

  --text-primary: ${palette.textPrimary};
  --text-secondary: ${palette.textSecondary};
  --text-tertiary: ${palette.textTertiary};

  --r-sm: ${radius.sm};
  --r-md: ${radius.md};
  --r-lg: ${radius.lg};

  /* 大屏专用：以 1920 为基准的缩放系数，1vw = 19.2px @1920
     组件内部尽量使用 vw/vh/rem 组合 + 响应式媒体查询 */
  --space-xs: ${spacing.xs};
  --space-sm: ${spacing.sm};
  --space-md: ${spacing.md};
  --space-lg: ${spacing.lg};
  --space-xl: ${spacing.xl};
  --space-xxl: ${spacing.xxl};

  /* 发光阴影（科技感主色外发光） */
  --glow-cyan: 0 0 12px rgba(0, 212, 255, 0.5), 0 0 32px rgba(0, 212, 255, 0.25);
  --glow-success: 0 0 10px rgba(0, 255, 136, 0.55);
  --glow-warning: 0 0 10px rgba(255, 176, 32, 0.55);
  --glow-danger: 0 0 12px rgba(255, 77, 79, 0.6);
}
`;
