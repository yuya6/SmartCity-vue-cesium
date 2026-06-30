<template>
  <div
    class="dash-layout"
    :class="[`dash-layout--${variant}`, { 'dash-layout--bordered': showCorners }]"
  >
    <!-- 顶栏 -->
    <header class="dash-layout__top">
      <slot name="top" />
    </header>

    <!-- 左侧面板 -->
    <aside class="dash-layout__left">
      <div class="dash-layout__col dash-layout__col--left">
        <slot name="left" />
      </div>
    </aside>

    <!-- 中央区域（地图/主视图） -->
    <main class="dash-layout__center">
      <div class="dash-layout__center-inner">
        <!-- 左上 KPI 行（覆盖） -->
        <div v-if="$slots['center-left']" class="dash-layout__center-top-left">
          <slot name="center-left" />
        </div>
        <div v-if="$slots['center-right']" class="dash-layout__center-top-right">
          <slot name="center-right" />
        </div>
        <slot />
        <!-- 底部时间轴覆盖 -->
        <div v-if="$slots['center-bottom']" class="dash-layout__center-bottom">
          <slot name="center-bottom" />
        </div>
      </div>
    </main>

    <!-- 右侧面板 -->
    <aside class="dash-layout__right">
      <div class="dash-layout__col dash-layout__col--right">
        <slot name="right" />
      </div>
    </aside>

    <!-- 底栏 -->
    <footer v-if="$slots.bottom" class="dash-layout__bottom">
      <slot name="bottom" />
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * DashboardLayout — 大屏经典三栏+顶/底布局骨架
 *  variants:
 *    - 'classic' (默认)：top | left | center | right | bottom
 *    - 'compact'：压缩边距（小屏/1080p）
 *    - 'immersive'：左右半透明浮层叠加在地图上（沉浸风）
 */
withDefaults(defineProps<{
  variant?: 'classic' | 'compact' | 'immersive';
  showCorners?: boolean;
}>(), {
  variant: 'classic',
  showCorners: true,
});
</script>

<style scoped lang="css">
.dash-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(320px, 22vw) 1fr minmax(320px, 22vw);
  grid-template-rows: 64px 1fr auto;
  grid-template-areas:
    "top    top     top"
    "left   center  right"
    "bottom bottom  bottom";
  width: 100%;
  height: 100vh;
  height: 100dvh;
  gap: 10px;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
  background:
    radial-gradient(1000px 600px at 50% -10%, rgba(0,120,212,.15), transparent 60%),
    radial-gradient(800px 400px at 10% 100%, rgba(0,212,255,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 100%, rgba(176,102,255,.07), transparent 60%),
    var(--bg-deep);
}
.dash-layout::before,
.dash-layout::after {
  content: '';
  position: absolute;
  inset: 16px;
  border: 1px dashed var(--border-subtle);
  pointer-events: none;
  opacity: .8;
  z-index: 0;
}
.dash-layout--bordered::before {
  inset: 16px;
  border-style: solid;
  border-color: rgba(0,212,255,.12);
  box-shadow: inset 0 0 40px rgba(0,120,212,.08);
}

.dash-layout--compact {
  gap: 6px;
  padding: 6px;
  grid-template-columns: minmax(280px, 20vw) 1fr minmax(280px, 20vw);
  grid-template-rows: 54px 1fr auto;
}
.dash-layout--compact::before { inset: 10px; }

.dash-layout--immersive {
  grid-template-columns: 0 1fr 0;
  padding: 10px;
}
.dash-layout--immersive .dash-layout__left,
.dash-layout--immersive .dash-layout__right {
  position: absolute;
  top: 84px;
  width: 22vw;
  min-width: 320px;
  z-index: 8;
  max-height: calc(100% - 160px);
  pointer-events: auto;
}
.dash-layout--immersive .dash-layout__left  { left: 14px; }
.dash-layout--immersive .dash-layout__right { right: 14px; }

.dash-layout__top { grid-area: top; z-index: 10; min-height: 0; }
.dash-layout__left { grid-area: left; z-index: 2; min-height: 0; display: flex; }
.dash-layout__right { grid-area: right; z-index: 2; min-height: 0; display: flex; }
.dash-layout__center {
  grid-area: center;
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  overflow: hidden;
  background: rgba(8, 12, 36, 0.6);
}
.dash-layout__center::before,
.dash-layout__center::after {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  border: 2px solid var(--accent-cyan);
  pointer-events: none;
  z-index: 20;
  box-shadow: 0 0 8px rgba(0,212,255,.5);
}
.dash-layout__center::before { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
.dash-layout__center::after  { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }
.dash-layout__center-inner {
  position: relative;
  width: 100%; height: 100%;
}
.dash-layout__center-top-left {
  position: absolute; top: 10px; left: 10px;
  display: grid; gap: 8px;
  z-index: 10;
  max-width: 46%;
}
.dash-layout__center-top-right {
  position: absolute; top: 10px; right: 10px;
  display: grid; gap: 8px;
  z-index: 10;
  max-width: 46%;
}
.dash-layout__center-bottom {
  position: absolute; left: 10px; right: 10px; bottom: 10px;
  z-index: 10;
}
.dash-layout__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-height: 0;
}
.dash-layout--compact .dash-layout__col { gap: 6px; }

.dash-layout__bottom {
  grid-area: bottom;
  z-index: 10;
  min-height: 0;
}

/* 响应式：<1600 时缩小左右列宽度 */
@media (max-width: 1920px) {
  .dash-layout { grid-template-columns: minmax(300px, 23vw) 1fr minmax(300px, 23vw); }
}
@media (max-width: 1600px) {
  .dash-layout { grid-template-columns: minmax(280px, 25vw) 1fr minmax(280px, 25vw); }
}
</style>
