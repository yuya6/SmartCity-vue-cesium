/**
 * 控件库入口：
 *   1. 将主题 Tokens 以 <style> 注入到 document.head
 *   2. 引入全局样式（若尚未引入）
 *   3. 导出所有组件、类型与 hooks
 *
 * 使用方式一（完整注册）：
 *   import { installSmartDash } from '@/components';
 *   app.use(installSmartDash);
 *
 * 使用方式二（按需导入）：
 *   import KpiCard from '@/components/cards/KpiCard.vue';
 */
import type { App } from 'vue';
import { themeVariables } from './shared/theme';
import './shared/styles.css';

const STYLE_ID = '__smart-dash-theme__';

function injectThemeTokens() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.setAttribute('type', 'text/css');
  style.textContent = themeVariables;
  document.head.appendChild(style);
}

export function installSmartDash(_app: App) {
  injectThemeTokens();
  // 预留：后续可通过 app.component('XXX', Comp) 全局注册
}

/* 立即注入 tokens（组件被 import 时触发） */
injectThemeTokens();

/* ---------- 统一导出（便于 IDE 智能提示） ---------- */
export * from './shared/types';
export * from './shared/theme';
export * from './shared/hooks';
export * from './shared/lazy';
