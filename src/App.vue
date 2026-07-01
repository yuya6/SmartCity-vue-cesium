<template>
  <DashboardLayout variant="classic" show-corners>
    <!-- ========== 顶栏 ========== -->
    <template #top>
      <TopNav
        v-model="topTab"
        :items="topNavItems"
        subtitle="SMART CITY OPERATION CENTER"
        bordered
      >
        智慧广州 · 城市运行管理中心
      </TopNav>
    </template>

    <!-- ========== 左侧面板 ========== -->
    <template #left>
      <!-- KPI 2×2 -->
      <div class="col-block kpi-grid">
        <KpiCard
          label="常住人口"
          :value="kpi.population"
          unit="万人"
          :trend="{ direction: 'up', value: '+1.2%', caption: '较上月' }"
          accent="primary"
          size="md"
        >
          <template #icon><component :is="IconUsers" size="18" /></template>
        </KpiCard>
        <KpiCard
          label="地区生产总值"
          :value="kpi.gdp"
          unit="亿元"
          :trend="{ direction: 'up', value: '+5.8%', caption: '同比' }"
          accent="success"
          size="md"
        >
          <template #icon><component :is="IconChart" size="18" /></template>
        </KpiCard>
        <KpiCard
          label="在岗机动车"
          :value="kpi.vehicles"
          unit="万辆"
          :trend="{ direction: 'up', value: '+3.1%', caption: '较昨日' }"
          accent="warning"
          size="md"
        >
          <template #icon><component :is="IconCar" size="18" /></template>
        </KpiCard>
        <KpiCard
          label="空气质量 AQI"
          :value="kpi.aqi"
          unit="μg/m³"
          :trend="{ direction: 'down', value: '-6.4%', caption: '较上周' }"
          accent="info"
          size="md"
        >
          <template #icon><component :is="IconLeaf" size="18" /></template>
        </KpiCard>
      </div>

      <!-- 区域人口热力 -->
      <SectionHeader title="区域人口分布" size="md" class="col-block-title">
        <template #icon><component :is="IconMapPin" size="14" /></template>
        <template #extra>
          <FilterChip
            v-model="regionFilter"
            :options="regionFilterOptions"
            size="sm"
          />
        </template>
      </SectionHeader>
      <div class="col-block col-block--stretch-min">
        <BarChart
          :data="regionBar"
          direction="horizontal"
          :show-labels="true"
          :height="220"
          title=""
          @bar-click="(_, it) => onRegionClick(it)"
        />
      </div>

      <!-- 24h 人口热力 -->
      <SectionHeader title="24h × 7天 客流密度" size="md" class="col-block-title">
        <template #icon><component :is="IconActivity" size="14" /></template>
      </SectionHeader>
      <div class="col-block col-block--stretch-max">
        <Heatmap
          :data="heatmapData"
          :rows="heatRows"
          :cols="heatCols"
          :height="220"
          title=""
        />
      </div>
    </template>

    <!-- ========== 中央（Cesium 3D 地图） ========== -->
    <div id="cesiumContainer" ref="cesiumContainer" class="center-map" />

    <!-- 中央浮层：左上角筛选 + 右上状态 -->
    <template #center-left>
      <div class="center-widget center-widget--filter fade-in">
        <div class="center-widget__label"><StatusDot status="success" label="实时数据" pulse size="sm" /></div>
        <FilterChip v-model="mapFilter" :options="mapFilterOptions" size="sm" />
      </div>
      <div class="center-widget center-widget--kpi fade-in">
        <div class="center-widget__row">
          <div class="mini-kpi">
            <span class="mini-kpi__label text-secondary">今日警情</span>
            <span class="mini-kpi__value mono" style="color:var(--color-danger)">{{ miniAlerts }}</span>
          </div>
          <Divider direction="vertical" :glow="false" />
          <div class="mini-kpi">
            <span class="mini-kpi__label text-secondary">在线设备</span>
            <span class="mini-kpi__value mono" style="color:var(--color-success)">{{ miniDevices }}</span>
          </div>
          <Divider direction="vertical" :glow="false" />
          <div class="mini-kpi">
            <span class="mini-kpi__label text-secondary">当前游客</span>
            <span class="mini-kpi__value mono" style="color:var(--accent-cyan)">{{ miniVisitors }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 中央底部时间轴 -->
    <template #center-bottom>
      <Timeline
        v-model:current="tlCurrent"
        :events="tlEvents"
        title="今日事件"
        orientation="horizontal"
        interactive
        collapsible
        size="sm"
        width="85%"
        @select="(_, ev) => console.log('事件:', ev.title)"
      />
    </template>

    <!-- ========== 右侧面板 ========== -->
    <template #right>
      <!-- 交通 / 环境 Gauge + 饼图 -->
      <div class="col-block gauges-grid">
        <GaugeCard
          label="道路拥堵指数"
          :value="gaugeTraffic"
          unit=""
          sub-text="0 畅通 ~ 1 拥堵"
        />
        <GaugeCard
          label="CPU 算力占用"
          :value="gaugeCpu"
          sub-text="管理中心"
          :stops="[[0,'#00FF88'],[0.65,'#00D4FF'],[0.85,'#FFB020'],[1,'#FF4D4F']]"
        />
      </div>

      <SectionHeader title="行业经济结构" size="md" class="col-block-title">
        <template #icon><component :is="IconBuilding" size="14" /></template>
        <template #extra><GlowText accent="primary" size="sm">{{ gdpSectors.reduce((s, v) => s + v.value, 0) }} 亿</GlowText></template>
      </SectionHeader>
      <div class="col-block col-block--stretch-min">
        <PieChart
          :data="gdpSectors"
          :donut="true"
          :show-legend="true"
          :height="240"
          title=""
        />
      </div>

      <SectionHeader title="广州 · 区县热力" size="md" class="col-block-title">
        <template #icon><component :is="IconMapPin" size="14" /></template>
      </SectionHeader>
      <div class="col-block col-block--stretch-max">
        <RegionMap
          v-model="selectedRegion"
          :data="regionMapData"
          title=""
          :show-legend="true"
          @select="(r) => console.log('区县:', r?.name)"
        />
      </div>
    </template>

    <!-- ========== 底栏 ========== -->
    <template #bottom>
      <div class="bottom-bar smart-panel fade-up">
        <div class="bottom-bar__left">
          <StatusDot status="danger" pulse size="sm" label="应急预警" />
          <marquee-scroll class="bottom-bar__ticker" :items="tickers" />
        </div>
        <div class="bottom-bar__right">
          <div class="bottom-stat">
            <span class="bottom-stat__label text-secondary">网络状态</span>
            <StatusDot status="success" label="万兆骨干" pulse size="sm" />
          </div>
          <div class="bottom-stat">
            <span class="bottom-stat__label text-secondary">通信链路</span>
            <StatusDot status="success" label="5G+光纤双活" pulse size="sm" />
          </div>
          <div class="bottom-stat">
            <span class="bottom-stat__label text-secondary">数据刷新</span>
            <span class="mono" style="color:var(--accent-cyan)">{{ refreshTick }}s</span>
          </div>
        </div>
      </div>
    </template>
  </DashboardLayout>
</template>

<script setup lang="ts">
/* =========================================================
 *  智慧广州 · 城市运行管理中心 — Demo 展示
 *  - 演示控件库所有组件的使用方法、组合方式
 *  - Cesium 3D 地图仍位于中央主体（保留项目原有能力）
 *  - 所有数据集中在 src/mock 目录下，通过 mockApi 统一调用
 * =======================================================*/
import { onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import initViewer from './cesium/initViewer';
import MousePosition from './cesium/MousePosition';
import modifyMap from './cesium/modifyMap';
import modifyBuild from './cesium/modifyBuild';
import LightCone from './cesium/LightCone';
import RoadLightLine from './cesium/RoadLightLine';

/* ---------- 控件库组件（完整引入方式） ---------- */
import DashboardLayout from './components/layout/DashboardLayout.vue';
import TopNav from './components/interactive/TopNav.vue';
import SectionHeader from './components/ui/SectionHeader.vue';
import Divider from './components/ui/Divider.vue';
import GlowText from './components/ui/GlowText.vue';
import StatusDot from './components/ui/StatusDot.vue';
import FilterChip from './components/interactive/FilterChip.vue';
import Timeline from './components/interactive/Timeline.vue';
import KpiCard from './components/cards/KpiCard.vue';
import GaugeCard from './components/cards/GaugeCard.vue';
import BarChart from './components/charts/BarChart.vue';
import PieChart from './components/charts/PieChart.vue';
import Heatmap from './components/charts/Heatmap.vue';
import RegionMap from './components/geo/RegionMap.vue';
import MarqueeScroll from './components/_demo/MarqueeScroll.vue';
import {
  IconUsers, IconChart, IconCar, IconLeaf, IconMapPin, IconActivity, IconBuilding,
} from './components/ui/icons';

/* ---------- Mock 数据 & 异步接口（所有模拟数据统一从这里导入） ---------- */
import {
  mockApi,
  type DashboardKpi,
  type DashboardSnapshot,
} from './mock';
import type {
  BarChartItem, FilterOption, HeatmapCell, PieChartSlice,
  RegionMapItem, TimelineEvent,
} from './components/shared/types';
import type { TopNavItem } from './components/interactive/TopNav.vue';

/* 当前场景全局的光锥实例 */
let lightConeInstance: LightCone | null = null;
/* 当前场景全局的道路流光实例 */
let roadLightLineInstance: RoadLightLine | null = null;

/* ---------- 顶栏 & 侧栏配置 ---------- */
const topTab = ref<string>('overview');
// shallowRef：顶栏配置是「整体加载一次 + 整体更换」的静态配置，
// 不需要深层响应式代理；避免内部 icon: Component 对象被 Proxy 化，
// 防止 [Vue warn]: Component that was made a reactive object
const topNavItems = shallowRef<TopNavItem[]>([]);

/* ---------- 模拟数据：响应式实例（初始化空壳，onMounted 内填充） ---------- */
const kpi = reactive<DashboardKpi>({ population: 0, gdp: 0, vehicles: 0, aqi: 0 });

const regionFilterOptions = ref<FilterOption[]>([]);
const regionFilter = ref<string>('pop');

const regionBar = ref<BarChartItem[]>([]);
const gdpSectors = ref<PieChartSlice[]>([]);

const heatRows = ref<string[]>([]);
const heatCols = ref<string[]>([]);
const heatmapData = ref<HeatmapCell[]>([]);

const selectedRegion = ref<string>('tianhe');
const regionMapData = ref<RegionMapItem[]>([]);
let regionNameToId: Record<string, string> = {};
const onRegionClick = (it: BarChartItem) => {
  selectedRegion.value = regionNameToId[it.label] || '';
};

/* 仪表数据 */
const gaugeTraffic = ref(0);
const gaugeCpu = ref(0);

/* 中央浮层 */
const mapFilter = ref<string>('people');
const mapFilterOptions = ref<FilterOption[]>([]);
const miniAlerts = ref(0);
const miniDevices = ref(0);
const miniVisitors = ref(0);

/* 时间轴事件 */
const tlCurrent = ref<number>(Date.now());
const tlEvents = ref<TimelineEvent[]>([]);

/* 底栏预警滚动条 */
const tickers = ref<string[]>([]);
const refreshTick = ref(5);

/* ---------- 周期性刷新（模拟实时数据）：使用 mockApi.simulateTick 保证一致性 ---------- */
let timer = 0;
const snapshot = reactive<DashboardSnapshot>({
  kpi,
  gauges: { traffic: 0, cpu: 0 },
  mini: { alerts: 0, devices: 0, visitors: 0 },
  refreshTick: 5,
});
const runSim = () => {
  // 每次基于前一状态「抖动」出下一帧结果，行为完全等价于原 runSim
  const next = mockApi.simulateTick(snapshot);

  // 同步到 snapshot 本身（保持引用一致，作为下次迭代的 prev）
  Object.assign(snapshot.kpi, next.kpi);
  snapshot.gauges.traffic = next.gauges.traffic;
  snapshot.gauges.cpu = next.gauges.cpu;
  Object.assign(snapshot.mini, next.mini);
  snapshot.refreshTick = next.refreshTick;

  // 同步到模板消费的 ref/reactive（与原变量一一对应，避免模板改动）
  gaugeTraffic.value = next.gauges.traffic;
  gaugeCpu.value = next.gauges.cpu;
  miniAlerts.value = next.mini.alerts;
  miniDevices.value = next.mini.devices;
  miniVisitors.value = next.mini.visitors;
  refreshTick.value = next.refreshTick;
};

onMounted(async () => {
  /* ---------- 1) 加载 Mock 数据：并行 3 个接口（结构等价于未来的后端 API） ---------- */
  const [configs, snap, charts, geo] = await Promise.all([
    mockApi.fetchDashboardConfigs(),
    mockApi.fetchDashboardSnapshot(),
    mockApi.fetchDashboardCharts(),
    mockApi.fetchDashboardGeoEvents(),
  ]);

  topNavItems.value = configs.topNavItems;
  regionFilterOptions.value = configs.regionFilterOptions;
  mapFilterOptions.value = configs.mapFilterOptions;
  topTab.value = configs.defaults.topTab;
  regionFilter.value = configs.defaults.regionFilter;
  mapFilter.value = configs.defaults.mapFilter;

  Object.assign(kpi, snap.kpi);
  Object.assign(snapshot, snap);
  gaugeTraffic.value = snap.gauges.traffic;
  gaugeCpu.value = snap.gauges.cpu;
  miniAlerts.value = snap.mini.alerts;
  miniDevices.value = snap.mini.devices;
  miniVisitors.value = snap.mini.visitors;
  refreshTick.value = snap.refreshTick;

  regionBar.value = charts.regionBar;
  gdpSectors.value = charts.gdpSectors;
  heatRows.value = charts.heatmap.rows;
  heatCols.value = charts.heatmap.cols;
  heatmapData.value = charts.heatmap.data;

  regionMapData.value = geo.regions;
  selectedRegion.value = geo.defaultSelectedRegion;
  regionNameToId = geo.regionNameToId;
  tlEvents.value = geo.events;
  tlCurrent.value = geo.defaultEventCursor;
  tickers.value = geo.tickers;

  /* ---------- 2) Cesium 初始化（保留原项目地图能力） ---------- */
  const viewer = await initViewer();
  modifyMap(viewer);
  void new MousePosition(viewer);

  const osmBuildings = await Cesium.createOsmBuildingsAsync({
    defaultColor: Cesium.Color.WHITE.withAlpha(0.9),
    enableShowOutline: true,
  });
  viewer.scene.primitives.add(osmBuildings);
  void modifyBuild(viewer, { tileset: osmBuildings, showExpression: true });
  lightConeInstance = new LightCone(viewer);

  /* ---------- 2.5) 道路流光效果（GeoJSON：public/geojson/roadline.geojson）
   *   用户已放入 public/texture/spriteline1.png，此处用 style='sprite' 启用真正的纹理采样；
   *   如需纯数学光带改为 style='flow'。
   */
   roadLightLineInstance = new RoadLightLine({
     viewer,
     geojsonUrl: `${import.meta.env.BASE_URL}geojson/roadline.geojson`,
     textureUrl: `${import.meta.env.BASE_URL}texture/spriteline1.png`,
     textureRepeat: 1.0,
     color: Cesium.Color.fromCssColorString('#50FF80'),
     style: 'sprite',
     headOffset: 0.15,
     speed: 0.0035,
     width: 4,
     lift: true,
     liftHeight: 20,
     debug: true,
   });
  roadLightLineInstance.onRoadClick = (_id, _props) => {
    // 可选：把点击到的道路信息在控制台或大屏侧边栏展示
    // if (import.meta.env.DEV) console.log('[App] 选中道路', id, props);
  };

  /* ---------- 3) 数据更新定时器 ---------- */
  timer = window.setInterval(runSim, 5000);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  roadLightLineInstance?.destroy();
  roadLightLineInstance = null;
  lightConeInstance?.destroy();
  lightConeInstance = null;
});
</script>

<style>
/* ========== 布局相关：App 级样式（影响子组件 class） ========== */
.col-block {
  min-height: 0;
}
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.gauges-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.col-block-title { margin-top: 0; }

/* 让每个区块合理分配剩余高度 */
.dash-layout__col {
  overflow: hidden;
}
.dash-layout__col > * {
  min-height: 0;
}
.col-block--stretch-min { flex: 0 0 auto; }
.col-block--stretch-max { flex: 1 1 auto; min-height: 0; display: flex; }
.col-block--stretch-max > * { flex: 1 1 auto; min-height: 0; }

/* 中央地图：填满 DashboardLayout center 区域 */
.center-map {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* 中央浮层小控件 */
.center-widget {
  backdrop-filter: blur(10px);
  background: linear-gradient(180deg, rgba(12,18,48,.92), rgba(12,18,48,.72));
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 8px 12px;
}
.center-widget--filter {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  align-self: flex-start;
}
.center-widget__label { font-size: 0.72rem; }
.center-widget--kpi {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  align-self: flex-start;
}
.center-widget__row {
  display: grid;
  grid-template-columns: 1fr 1px 1fr 1px 1fr;
  align-items: center;
  gap: 12px;
}
.mini-kpi { display: flex; flex-direction: column; gap: 2px; min-width: 92px; }
.mini-kpi__label { font-size: 0.7rem; letter-spacing: .08em; }
.mini-kpi__value { font-size: 1.2rem; font-weight: 700; letter-spacing: .02em; text-shadow: 0 0 8px currentColor; }

/* 底栏 */
.bottom-bar {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 8px 16px;
  min-height: 44px;
}
.bottom-bar__left {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  height: 28px;
}
.bottom-bar__ticker { color: var(--color-warning); font-size: 0.8rem; letter-spacing: .04em; }
.bottom-bar__right {
  display: inline-flex;
  gap: 20px;
  align-items: center;
  font-size: 0.8rem;
}
.bottom-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.bottom-stat__label { font-size: 0.72rem; letter-spacing: .06em; }
</style>
