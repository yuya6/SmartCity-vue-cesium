🏙️ vue-cesium-smartcity

> **智慧广州 · 城市运行管理中心** — 基于 Vue 3 + TypeScript + Cesium 构建的智慧城市 3D 可视化大屏。
>
> 整合 Cesium 三维地球引擎、自研大屏控件库与 Mock 数据系统，提供城市运行管理驾驶舱的完整演示方案。

---
<img width="2549" height="1403" alt="7707f31d-4364-439d-a221-0781deaef0fe" src="https://github.com/user-attachments/assets/ef8a1c6c-4e3c-447c-a63f-beca21c7407a" />
<img width="2549" height="1403" alt="9d7a2de8-08cd-4537-8436-d77eafae3941" src="https://github.com/user-attachments/assets/0197a8c8-6d40-4a0a-90f4-e0b1139ad7c8" />


## 📋 目录

- [✨ 功能特性](#-功能特性)
- [💻 浏览器兼容性 \& 硬件要求](#-浏览器兼容性--硬件要求)
- [🛠️ 技术栈](#️-技术栈)
- [📁 项目结构](#-项目结构)
- [🚀 快速开始](#-快速开始)
  - [前置要求](#前置要求)
  - [🔋 安装 Git LFS（二进制大文件必需）](#-安装-git-lfs二进制大文件必需)
  - [安装依赖](#安装依赖)
  - [配置 Cesium Ion Token（可选但推荐）](#配置-cesium-ion-token可选但推荐)
  - [启动开发服务器](#启动开发服务器)
  - [生产构建与预览](#生产构建与预览)
- [⚙️ 环境配置](#️-环境配置)
- [🎯 核心模块](#-核心模块)
  - [Cesium 3D 地图](#cesium-3d-地图)
  - [SmartDash 控件库](#smartdash-控件库)
  - [Mock 数据层](#mock-数据层)
- [🧩 主界面布局](#-主界面布局)
- [📜 可用脚本](#-可用脚本)
- [🌐 部署指南](#-部署指南)
  - [Nginx](#nginx)
  - [GitHub Pages](#github-pages)
  - [Vercel / Netlify](#vercel--netlify)
- [❓ FAQ / 常见问题](#-faq--常见问题)
- [🌟 设计亮点](#-设计亮点)
- [🤝 扩展指南](#-扩展指南)
- [🛠️ 贡献指南](#️-贡献指南)
- [🗺️ 路线图 Roadmap](#️-路线图-roadmap)
- [🙌 致谢 / Credits](#-致谢--credits)
- [📄 License](#-license)

---

## ✨ 功能特性

- 🌏 **Cesium 3D 地图**：OSM 3D 建筑白模 + 广州本地地形切片（LOD 0~14）+ 广州塔默认视角
- 💡 **建筑高亮着色**：基于 CustomShader 的条件着色与轮廓显示
- 🛣️ **道路流光效果**：GeoJSON 驱动，支持 flow（流动光带）/ sprite（纹理虚线）双模式
- 🔦 **光锥特效**：重点区域光柱强调，支持动态开关与销毁
- 🖱️ **鼠标经纬度**：实时显示光标位置的经纬度与高程
- 📊 **4 类 KPI 卡片**：人口 / GDP / 机动车 / AQI，含趋势涨跌指示
- 📈 **原生 Canvas 图表**：柱状图 / 饼图（甜甜圈）/ 折线图 / 热力矩阵，零第三方图表库依赖
- 🗺️ **SVG 区县热力图**：广州 11 区可视化，支持点击选中联动
- ⏱️ **可拖拽时间轴**：今日事件时间线，游标可交互
- 📻 **跑马灯预警条**：应急预警文字滚动展示
- 🔄 **实时数据模拟**：每 5 秒基于前序状态做有界抖动，模拟实时数据流
- 🎨 **主题化控件库**：CSS 变量驱动的大屏 UI 设计语言，支持 3 种布局变体

---

## 💻 浏览器兼容性 & 硬件要求

Cesium 依赖 WebGL 2.0 与现代显卡，**不支持 IE 以及老旧的移动设备浏览器**。

### 支持浏览器

| 浏览器 | 最低版本 | 说明 |
| :--- | :--- | :--- |
| **Chrome / Edge (Chromium)** | ≥ 110 | ✅ 推荐首选，WebGL 性能最佳，调试工具齐全 |
| **Firefox** | ≥ 110 | ✅ 可用，但部分 Cesium 着色器表现略逊于 Chromium |
| **Safari** | ≥ 16.4 | ⚠️ 可用，需在「开发 → 实验功能」中确认 WebGL 2.0 已开启 |
| **360 / QQ / 国产双核** | — | ⚠️ 必须切换到「极速模式」（Chromium 内核），兼容模式直接白屏 |

### 硬件要求

| 级别 | CPU | 内存 | 显卡 | 推荐场景 |
| :--- | :--- | :--- | :--- | :--- |
| **最低** | i5-8 代 / R5-3600 | **8 GB** | 核显 UHD620 以上（支持 WebGL 2.0） | 开发模式、仅代码修改，不做视角旋转 |
| **推荐** | i5-12 代 / R5-5600 | **16 GB** | GTX 1060 / RX 580 以上 4GB 独显 | 流畅旋转视角、完整加载地形 + 建筑 + 流光 |
| **演示大屏** | i7-12 代 / R7-5800 | **32 GB** | RTX 3060 以上 8GB 独显 | 4K 分辨率大屏稳定 60 FPS |

> ⚠️ **常见坑**：轻薄本节能模式、笔记本走核显、远程桌面（RDP）都会导致 WebGL 性能骤降或驱动能力不足。如果出现白屏/低帧率，请先在 `chrome://gpu` 里确认 **WebGL2: Hardware accelerated**。

---

## 🛠️ 技术栈

| 分类 | 包名 | 版本 | 说明 |
| :--- | :--- | :--- | :--- |
| **框架** | `vue` | ^3.5.34 | Composition API + `<script setup>` |
| **语言** | `typescript` | ~6.0.2 | 全链路类型安全 |
| **构建** | `vite` | ^8.0.12 | 极速 HMR + Rollup 构建 |
| **Vue 插件** | `@vitejs/plugin-vue` | ^6.0.6 | Vite Vue 3 SFC 支持 |
| **3D 引擎** | `cesium` | ^1.142.0 | 三维地球与 GIS 能力核心 |
| **Cesium 插件** | `vite-plugin-cesium` | ^1.2.23 | 自动注入 Cesium 静态资源与 Worker |
| **导航控件** | `cesium-navigation-es6` | ^3.0.9 | 罗盘 + 缩放控件（可选启用） |
| **类型辅助** | `@types/node` | ^24.12.3 | Node API 类型 |
| **TS 配置** | `@vue/tsconfig` | ^0.9.1 | Vue 官方 TS 预设 |
| **类型检查** | `vue-tsc` | ^3.2.8 | SFC + TS 构建前类型校验 |

---

## 📁 项目结构

```
vue-cesium-smartcity/
├── public/                          # 静态资源（Vite 原样拷贝）
│   ├── geojson/
│   │   └── roadline.geojson         #   道路网 GeoJSON 数据
│   ├── model/
│   │   ├── Air.glb                  #   飞行器 GLB 模型 (~573KB)
│   │   └── pyramid.glb              #   地标金字塔 GLB 模型 (~134KB)
│   ├── terrains/gz/                 #   广州本地地形切片（LOD 0/2~14，共 12,000+ 个 .terrain 文件）
│   │   ├── meta.json / layer.json   #     Cesium Terrain Provider 元数据
│   │   └── {z}/{x}/{y}.terrain      #     量化地形瓦片（请使用 Git LFS 管理）
│   └── texture/                     #   纹理资源（流光、天空盒、粒子等）
│       ├── spriteline1.png          #     道路流光 sprite 纹理
│       ├── Fire.png / smoke.png     #     粒子特效贴图
│       ├── logo.png / gzt.png       #     UI/地标贴图
│       └── sky/                     #     天空盒六面贴图（px/py/pz/nx/ny/nz.jpg）
│
├── src/
│   ├── App.vue                      # 🔸 大屏主入口（布局组装 + Cesium 初始化）
│   ├── main.ts                      #    Vue 应用入口，注册 SmartDash 控件库
│   │
│   ├── cesium/                      # 🔷 Cesium 核心封装（6 个模块）
│   │   ├── initViewer.ts            #    Viewer 初始化（光照 / 相机 / 防黑三重保险）
│   │   ├── modifyMap.ts             #    地图底图样式修饰
│   │   ├── modifyBuild.ts           #    3D 建筑 CustomShader 高亮
│   │   ├── MousePosition.ts         #    鼠标经纬度悬浮条
│   │   ├── LightCone.ts             #    光锥特效（重点区域光柱）
│   │   └── RoadLightLine.ts         #    道路流光（flow / sprite 双模式）
│   │
│   ├── components/                  # 🎨 SmartDash 大屏控件库（18 个组件）
│   │   ├── index.ts                 #    入口：主题注入 + Vue Plugin + 统一导出
│   │   ├── layout/
│   │   │   └── DashboardLayout.vue  #    三栏大屏布局骨架（3 variants + 7 插槽）
│   │   ├── cards/                   #    KpiCard / GaugeCard / TrendCard
│   │   ├── charts/                  #    BarChart / PieChart / Heatmap / LineChart
│   │   ├── interactive/             #    TopNav / SideNav / FilterChip / Timeline
│   │   ├── geo/                     #    RegionMap（SVG 区县热力）
│   │   ├── ui/                      #    SectionHeader / Divider / StatusDot / GlowText / icons
│   │   ├── _demo/                   #    MarqueeScroll（预警跑马灯 Demo）
│   │   └── shared/                  #    types / theme / styles / hooks / canvas-utils / lazy
│   │
│   ├── mock/                        # 📦 Mock 数据层（API 同形，便于切换真实后端）
│   │   ├── index.ts                 #    统一出口
│   │   ├── mockApi.ts               #    异步 API（4 个并行接口 + 1 个实时抖动）
│   │   ├── types.ts                 #    Mock 数据类型定义
│   │   ├── navigation.ts            #    顶栏 Tab / 筛选器配置
│   │   ├── kpi.ts                   #    KPI / 仪表 / 迷你 KPI 基准值
│   │   ├── charts.ts                #    柱状图 / 饼图 / 热力图数据工厂
│   │   └── geo-and-events.ts        #    区县数据 / 时间轴事件 / 预警跑马灯
│   │
│   └── assets/json/plane.json       # 静态 JSON 资源
│
├── docs/                            # 📖 文档资源（请新建，用于放截图、设计文档等）
│   └── screenshot.png               #   （你需要补充的）README 用大屏截图
│
├── .env.example                     # Cesium Ion Token 配置示例
├── .gitattributes                   # ☑️ Git LFS 跟踪规则（见下文）
├── .gitignore
├── LICENSE                          # MIT 开源协议
├── README.md                        # 本文件
├── index.html                       # Vite HTML 入口
├── package.json
├── package-lock.json
├── tsconfig.json                    # TS 根配置（引用 app/node 两个子项目）
├── tsconfig.app.json                # 源码侧 TS 配置
├── tsconfig.node.json               # Vite 配置侧 TS 配置
└── vite.config.ts                   # Vite 配置（Vue + Cesium 插件 + @ 别名）
```

---

## 🚀 快速开始

### 前置要求

| 依赖 | 最低版本 | 说明 |
| :--- | :--- | :--- |
| **Node.js** | ≥ 18 | 推荐 **20 LTS**，否则 Vite 8 会提示警告 |
| **npm** | ≥ 9 | 或 pnpm ≥ 8 / yarn ≥ 1.22（项目自带 `package-lock.json`，建议 npm） |
| **Git** | ≥ 2.30 | Windows 用户推荐官方 Git for Windows |
| **Git LFS** | ≥ 3.0 | **必装**，否则 public/terrains 与 .glb/.jpg 都是指针文件（见下一小节） |

### 🔋 安装 Git LFS（二进制大文件必需）

> **为什么需要 LFS？** 项目 `public/` 目录有 **1.2 万个 .terrain 地形瓦片 + GLB 模型 + 天空盒 JPG + PNG 纹理，共约 125 MB**。
> 这些二进制资源如果直接提交到普通 Git，clone 会极慢、仓库体积不可逆地膨胀。Git LFS 将它们托管在独立的对象存储中，只在 checkout 时下载真正需要的版本。

**首次使用 LFS（本机只需执行一次）：**

```bash
# 1) 安装 LFS 客户端（如果没装）
#    Windows: 官方 Git for Windows 已自带 LFS，跳过此步
#    macOS:   brew install git-lfs
#    Ubuntu:  sudo apt install git-lfs

# 2) 为当前用户启用 LFS 全局钩子
git lfs install
```

**克隆本仓库（LFS 对象会自动下载）：**

```bash
git lfs clone https://github.com/your_username/your_repo.git
# 或者普通 clone 也行（新版本 Git 会自动拉 LFS）：
git clone https://github.com/your_username/your_repo.git
```

**本地仓库第一次启用 LFS（如果你是把项目首次推到 GitHub 的人，执行一次即可）：**

```bash
git lfs install
git lfs track "*.terrain" "*.glb" "*.jpg" "*.png" "*.gif" "*.fbx" "*.gltf" "*.gz"
git add .gitattributes
git commit -m "chore: enable Git LFS for binary assets"
```

> 项目根目录已经包含一份 [`.gitattributes`](.gitattributes)，规则与上面一致；如果你 clone 下来发现 `.gitattributes` 已存在，跳过 `git lfs track` 那一步即可。

验证 LFS 是否生效：

```bash
git lfs ls-files        # 列出被 LFS 跟踪的文件（数量应 > 12000）
```

### 安装依赖

```bash
npm install
```

> 💡 **Cesium 下载很慢？** `cesium` 包有几十 MB，npm 默认源经常卡住。推荐配置国内镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

### 配置 Cesium Ion Token（可选但推荐）

Cesium Ion 提供高清影像、地形、3D 建筑等云端资源。虽然演示使用 OSM 建筑与本地地形可零 Token 运行，但建议配置以获得最佳效果：

1. 前往 [https://ion.cesium.com/](https://ion.cesium.com/) 注册免费账号
2. 在 Access Tokens 页面复制 Default Token
3. 复制 `.env.example` 为 `.env.local` 并填入：

```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# 然后用记事本 / VSCode 编辑 .env.local：
VITE_CESIUM_ION_TOKEN=你的真实Token
```

> 未配置时控制台会打印 `[Cesium] 未配置 VITE_CESIUM_ION_TOKEN` 警告，但不影响 OSM 建筑 + 本地地形的基础演示。

### 启动开发服务器

```bash
npm run dev
```

启动后浏览器访问终端提示的地址（默认 `http://localhost:5173`），即可看到广州城市运行管理中心大屏。

> ⚠️ **首次加载较慢是正常的**：OSM 3D 建筑瓦片 + 本地地形切片需要几秒到十几秒的流式加载（取决于显卡与网络）。

### 生产构建与预览

```bash
# 1) 类型检查（vue-tsc -b）+ 打包到 dist/
npm run build

# 2) 本地预览 dist/（验证构建结果是否正常）
npm run preview
```

---

## ⚙️ 环境配置

项目使用的环境变量（见 [`.env.example`](.env.example)）：

| 变量名 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `VITE_CESIUM_ION_TOKEN` | 否 | string | Cesium Ion 访问令牌。配置后可加载 Ion 云端高清影像 / 地形 / 3D Tiles |
| `VITE_API_BASE_URL` | 否 | string | **预留**：未来接真实后端时，用作 API 请求的 Base URL，通过 `import.meta.env.VITE_API_BASE_URL` 读取 |

> 📌 **Vite 约定**：只有以 `VITE_` 开头的变量才会被注入到客户端代码。私有变量（如数据库密码）不要加 `VITE_` 前缀。

如需新增环境变量，按相同规则在 `.env.local` 中追加即可。推荐的各环境文件分工：

- `.env` — 所有环境共用、**不含敏感信息**的默认值（可提交 Git）
- `.env.local` — 本地覆盖，**含敏感信息（Token、密码）**，已加入 `.gitignore`
- `.env.production` — 生产环境专用变量（如需，可提交 Git）
- `.env.development` — 开发环境专用变量（如需，可提交 Git）

---

## 🎯 核心模块

### Cesium 3D 地图

Cesium 相关代码统一在 [`src/cesium/`](src/cesium/) 下，各模块职责单一：

| 模块 | 入口函数/类 | 核心能力 |
| :--- | :--- | :--- |
| **initViewer** | `initViewer(): Promise<Viewer>` | 创建 Viewer；禁用全部默认 UI；三重保险防建筑发黑（夏至中午时间 + DirectionalLight 强度 3 + HDR）；默认相机飞往广州塔（113.3484, 23.0971, 高空 1500m，俯角 -30°） |
| **modifyMap** | `modifyMap(viewer): void` | 修饰底图样式（色调、对比度等） |
| **modifyBuild** | `modifyBuild(viewer, { tileset, showExpression })` | 对 OSM 3D 建筑应用 CustomShader，支持按条件高亮与描边 |
| **MousePosition** | `new MousePosition(viewer)` | 在场景右下角显示鼠标当前经纬度、高度 |
| **LightCone** | `new LightCone(viewer)` | 创建可动态添加/销毁的光锥光柱集合 |
| **RoadLightLine** | `new RoadLightLine({ viewer, geojsonUrl, style, ... })` | 加载道路 GeoJSON → 抬升 20m → 流光动画；支持 `flow`/`sprite` 两种 shader、点击回调、`setSpeed/setColor/destroy` |

在 [`App.vue`](src/App.vue#L377-L412) 中可看到它们的初始化顺序与参数配置。

---

### SmartDash 控件库

位于 [`src/components/`](src/components/)，通过 Vue Plugin 形式安装，支持完整注册与按需引入两种方式。

**方式一：完整注册**（项目当前做法，见 [`main.ts`](src/main.ts)）

```ts
import { installSmartDash } from '@/components';
app.use(installSmartDash);
```

**方式二：按需引入**

```ts
import KpiCard from '@/components/cards/KpiCard.vue';
```

**组件一览（18 个）**

| 分类 | 组件 | 文件 | 用途 |
| :--- | :--- | :--- | :--- |
| 布局 | `DashboardLayout` | [layout/DashboardLayout.vue](src/components/layout/DashboardLayout.vue) | 大屏骨架：`classic` / `compact` / `immersive` 三变体，7 插槽 |
| 卡片 | `KpiCard` | [cards/KpiCard.vue](src/components/cards/KpiCard.vue) | 含趋势箭头与涨跌比的 KPI 展示卡 |
| 卡片 | `GaugeCard` | [cards/GaugeCard.vue](src/components/cards/GaugeCard.vue) | 半圆仪表盘（支持自定义分段颜色） |
| 卡片 | `TrendCard` | [cards/TrendCard.vue](src/components/cards/TrendCard.vue) | 带迷你趋势线的卡片 |
| 图表 | `BarChart` | [charts/BarChart.vue](src/components/charts/BarChart.vue) | Canvas 横/纵向柱状图，可点击 |
| 图表 | `PieChart` | [charts/PieChart.vue](src/components/charts/PieChart.vue) | Canvas 饼图 / 甜甜圈图 + 图例 |
| 图表 | `Heatmap` | [charts/Heatmap.vue](src/components/charts/Heatmap.vue) | Canvas 二维热力矩阵 |
| 图表 | `LineChart` | [charts/LineChart.vue](src/components/charts/LineChart.vue) | Canvas 折线图（多 series） |
| 交互 | `TopNav` | [interactive/TopNav.vue](src/components/interactive/TopNav.vue) | 顶部 Tab 导航栏 |
| 交互 | `SideNav` | [interactive/SideNav.vue](src/components/interactive/SideNav.vue) | 侧边图标导航栏 |
| 交互 | `FilterChip` | [interactive/FilterChip.vue](src/components/interactive/FilterChip.vue) | 胶囊形单选筛选器 |
| 交互 | `Timeline` | [interactive/Timeline.vue](src/components/interactive/Timeline.vue) | 可拖拽游标的水平/垂直时间轴 |
| 地理 | `RegionMap` | [geo/RegionMap.vue](src/components/geo/RegionMap.vue) | SVG 区县轮廓热力图，点击选中联动 |
| UI | `SectionHeader` | [ui/SectionHeader.vue](src/components/ui/SectionHeader.vue) | 带图标 + 扩展区的区块标题 |
| UI | `Divider` | [ui/Divider.vue](src/components/ui/Divider.vue) | 水平/垂直发光分隔线 |
| UI | `StatusDot` | [ui/StatusDot.vue](src/components/ui/StatusDot.vue) | 脉冲指示点 + 文字标签 |
| UI | `GlowText` | [ui/GlowText.vue](src/components/ui/GlowText.vue) | 辉光文本 |
| UI | icons | [ui/icons.ts](src/components/ui/icons.ts) | 内联 SVG 图标合集 |
| Demo | `MarqueeScroll` | [_demo/MarqueeScroll.vue](src/components/_demo/MarqueeScroll.vue) | 预警跑马灯（示例级） |

共享工具在 [`shared/`](src/components/shared/) 下：
- `types.ts`：所有组件通用的 props / 数据类型
- `theme.ts`：CSS 变量主题（颜色、间距、阴影、字号等 tokens）
- `styles.css`：全局样式（重置 + `.mono` `.smart-panel` `.fade-in/up` 等工具类）
- `hooks.ts`：`useIntervalFn` / `useResizeObserver` 等小 hooks
- `canvas-utils.ts`：Canvas 2D 绘图辅助（圆角、渐变、文本度量等）
- `lazy.ts`：懒加载 / `IntersectionObserver` 工具

---

### Mock 数据层

位于 [`src/mock/`](src/mock/)，采用**「异步 API 形状与真实后端同形」**的设计，方便未来无缝切换。

**4 个并行加载接口**

```ts
// 返回 Promise<T>，内置 120~420ms 随机延迟模拟网络抖动
const [configs, snap, charts, geo] = await Promise.all([
  mockApi.fetchDashboardConfigs(),   // TopNav + 筛选器 + 默认选项
  mockApi.fetchDashboardSnapshot(),  // KPI + 仪表盘 + 迷你 KPI + 刷新间隔
  mockApi.fetchDashboardCharts(),    // 柱状图 + 饼图 + 热力矩阵
  mockApi.fetchDashboardGeoEvents(), // 区县热力 + 时间轴事件 + 预警跑马灯
]);
```

**1 个实时抖动接口**

```ts
// 每 5 秒基于「前一状态快照」做有界随机抖动，
// 保证数据平滑变化而非跳变，等价于 WebSocket push 的模拟。
const next = mockApi.simulateTick(previousSnapshot);
```

**静态常量与工厂函数**也直接导出，供对首屏敏感的场景使用：

```ts
import { BASE_KPI, TOP_NAV_ITEMS, buildHeatmapData } from '@/mock';
```

---

## 🧩 主界面布局

[`App.vue`](src/App.vue) 组装的完整驾驶舱（经典三栏布局）：

```
┌────────────────── TopNav 顶栏（智慧广州·城市运行管理中心 + Tab） ──────────────────┐
│ ┌──────────────────┐  中央浮层（左上）           ┌──────────────────┐ │
│ │  KPI 2×2 Grid    │  ┌ 实时数据状态 + 图层筛选 ┐ │  仪表 2×1 Gauges │ │
│ │ 常住人口  GDP    │  │ 警情 ｜ 在线设备 ｜ 游客 │ │ 拥堵指数 CPU占用 │ │
│ │ 在岗机动车 AQI   │  └──────────────────────┘ │                  │ │
│ ├──────────────────┤                            ├──────────────────┤ │
│ │ 区域人口分布      │                            │ 行业经济结构      │ │
│ │  (横向柱状图)    │     Cesium 3D 地图         │  (甜甜圈饼图)     │ │
│ │  · 点击联动      │     广州塔视角 + OSM 建筑   │                  │ │
│ ├──────────────────┤     光锥 + 道路流光效果     ├──────────────────┤ │
│ │ 24h × 7 天客流   │                            │ 广州 · 区县热力   │ │
│ │    热力矩阵      │                            │  (SVG 点击选中)  │ │
│ └──────────────────┘                            └──────────────────┘ │
├──────── Timeline 今日事件时间轴（支持拖拽游标） ─────────────────┤
├────── 底栏：应急预警跑马灯  ｜  网络状态 / 5G+通信 / 数据刷新间隔 ───────┤
```

---

## 📜 可用脚本

在项目根目录执行：

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动 Vite 开发服务器（HMR 热更新；默认 5173 端口） |
| `npm run build` | **先** `vue-tsc -b` 做 SFC 级类型检查，**再** `vite build` 输出到 `dist/` |
| `npm run preview` | 在本地以生产模式启动预览服务器，验证构建结果 |

---

## 🌐 部署指南

构建产物目录：`dist/`

> ⚠️ **非常重要**：`dist/` 内除了标准的 `index.html / assets/` 外，还会有 **`dist/Cesium/`、`dist/Assets/`、`dist/ThirdParty/`、`dist/Workers/`** 等 Cesium 静态资源目录（由 `vite-plugin-cesium` 自动注入）。**这些目录必须完整上传，不能遗漏，也不能被 SPA 路由规则覆盖**。否则 Cesium 会抛 404 白屏。

### Nginx

最推荐的部署方式（大屏、内网都常用）：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root   /var/www/vue-cesium-smartcity/dist;
    index  index.html;

    # 1) Cesium 静态资源（尤其 Workers / Assets）直接返回，不走 SPA fallback
    #    路径匹配越具体优先级越高，放在最前面
    location ~ ^/(Cesium|Assets|ThirdParty|Workers|terrains|model|geojson|texture)/ {
        try_files $uri =404;
        # 建议开启 gzip，Cesium 资源大
        gzip_static on;
        gzip_types application/javascript application/json image/png image/jpeg model/gltf-binary;
        expires 7d;
    }

    # 2) 缓存策略：带 hash 的静态文件永久缓存（Vite 产物命名规则）
    location /assets/ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 3) SPA 历史路由回退（目前项目无路由，但预留以防未来加）
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

Windows 版 Nginx 路径使用正斜杠即可，如 `D:/webapps/vue-cesium-smartcity/dist`。

### GitHub Pages

1. 在 `vite.config.ts` 中为 GitHub Pages 设置正确的 `base`：

   ```ts
   // 仓库名 vue-cesium-smartcity 时：base: '/vue-cesium-smartcity/'
   // 用户名组织页（<user>.github.io）时：base: '/'
   export default defineConfig({
     base: process.env.NODE_ENV === 'production' ? '/vue-cesium-smartcity/' : '/',
     plugins: [vue(), cesium()],
   });
   ```

2. 构建并将 `dist/` 内容推送到 `gh-pages` 分支。推荐使用 [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) GitHub Action 自动化。

> ⚠️ **GitHub Pages 免费仓库带宽限制 100GB/月**。本项目地形 + Cesium 每次访问会加载几十 MB 的二进制资源，访问量大时**很容易触达带宽上限**。生产演示建议用 Nginx / 对象存储（OSS/S3/COS）+ CDN。

### Vercel / Netlify

1. 构建命令：`npm run build`
2. 输出目录：`dist`
3. Node 版本：≥ 18（在平台 Settings / 环境变量中设置 `NODE_VERSION=20` 最稳妥）
4. Vercel SPA 重写：在项目根放 `vercel.json`：

   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

5. Netlify SPA 重写：在根放 `_redirects` 文件（构建前放到 `public/` 下即可自动拷贝）：

   ```
   /*    /index.html   200
   ```

---

## ❓ FAQ / 常见问题

### 1. 🖥️ 打开页面白屏 / 只有背景没有地图？

**按顺序排查：**

1. 按 F12 看 Console 是否有红色错误
   - `WebGL is not supported` → 浏览器 / 显卡不支持 WebGL 2.0，换 Chrome 并打开 `chrome://gpu` 确认硬件加速开启
   - `Cesium Ion Token unauthorized` / `401` → Token 配置错误，检查 `.env.local` 变量名是否为 `VITE_CESIUM_ION_TOKEN`，改完**必须重启 `npm run dev`**
   - `404 /Cesium/Workers/...` → 开发模式下 `vite-plugin-cesium` 未正确注入，确认 `vite.config.ts` 中有 `cesium()` 插件并重启
2. **地形/道路全空**：`public/terrains/gz/` 或 `public/geojson/roadline.geojson` 没克隆下来。跑 `git lfs ls-files`，如果为空说明 LFS 未启用，参见 [安装 Git LFS](#-安装-git-lfs二进制大文件必需)

### 2. 🏢 3D 建筑发黑 / 几乎看不见？

本项目在 [`initViewer.ts`](src/cesium/initViewer.ts#L38-L63) 中做了**「建筑发黑三重保险」**：

- 保险 1：强制场景时间 = 广州夏至中午 12 点（太阳光最强）
- 保险 2：自定义 `DirectionalLight` 强度 3.0
- 保险 3：开启 `highDynamicRange = true`（HDR）

如果仍然发黑，多半是以下几种情况：

1. **自定义了相机飞到了别的城市**（比如乌鲁木齐），太阳位置对不上 → 在 `initViewer.ts` 里同步修改 `noonLocal` 的 UTC 时间或调整 `DirectionalLight.direction`
2. **显卡驱动太旧**，PBR 计算异常 → 更新显卡驱动或换一台机器
3. **接入了自定义 3D Tiles**（不是 `createOsmBuildingsAsync` 自带的）→ 对该 Tileset 单独调用 `modifyBuild()` 或指定 `tileset.style`

### 3. 🛣️ 道路流光效果没显示？

1. RoadLightLine 默认从 `/geojson/roadline.geojson` 加载。浏览器 Network 面板如果这个文件是 404，说明 `public/geojson/` 目录内容缺失
2. `sprite` 模式需要 `/texture/spriteline1.png`，如果控制台有 `spriteline1.png 404`，会**自动降级为内置虚线算法**（还能看到流光但效果略差），把纹理补上即可
3. `lift: true`（默认）会把道路抬升 20m，如果相机放得很高（2km+），需要缩小地图再看

### 4. 📦 `npm install` 卡在 `cesium` 包下载？

切换 npm 镜像，或使用离线安装包：

```bash
npm config set registry https://registry.npmmirror.com
# 清理缓存后重试
npm cache clean --force
rm -rf node_modules package-lock.json   # PowerShell: Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### 5. ⏱️ 生产构建报内存不足（JavaScript heap out of memory）？

Cesium + vue-tsc 类型检查吃内存。在 Windows PowerShell 中临时扩容：

```bash
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

或改为 16 GB：`--max-old-space-size=16384`。

### 6. 🗺️ 点击区县热力图 / 柱状图没任何反应？

事件绑定写在了 `App.vue` 中但只打印到 Console（开发演示级别）。打开 F12 → Console 可以看到实际触发的日志。如果需要真实联动（比如 Cesium 相机飞到对应区县），请在 [`App.vue` 的 `onRegionClick`](src/App.vue#L288-L290) 和 [`RegionMap.vue` 的 `@select`](src/App.vue#L180) 回调里补相应逻辑。

### 7. 🔒 部署到 HTTPS 域名后 Cesium 资源提示 Mixed Content？

不要用任何 `http://` 开头的 Cesium Ion / 影像 / 地形 URL。全部改成 `https://` 或协议相对 `//`。本地地形在 `public/` 下为同源相对路径，不存在此问题。

---

## 🌟 设计亮点

1. **控件库化**：`components/index.ts` 提供 Vue Plugin 安装入口 + 主题 CSS 变量注入，可整体移植到其他大屏项目
2. **Mock 层解耦**：所有组件统一通过 `await mockApi.xxx()` 获取数据，形状与 RESTful API 一致；切换真实后端只需改 `mockApi.ts` 内部实现，**App.vue 模板无需修改**
3. **Cesium 健壮性**：针对 WebGL + PBR 常见的「建筑发黑」问题，做了三重保险（时间/光照/HDR），并且使用 `Cesium.createOsmBuildingsAsync` 公开 API 而非私有字段
4. **零第三方动画/图表依赖**：道路流光用 `requestAnimationFrame` + 自定义 GLSL（不用 gsap）；所有图表用原生 Canvas 2D 实现（不用 ECharts / Chart.js），包体更轻
5. **响应式颗粒度合理**：静态配置（如顶栏 Tab 数组）使用 `shallowRef`，避免 Vue 将 `Component` 类型代理化触发 `[Vue warn]`
6. **全链路 TypeScript**：从 Cesium 选项 → 组件 props → Mock 数据 → 模拟 tick 返回值，全部有类型定义；Vite 构建前强制 `vue-tsc -b` 做 SFC 级类型检查
7. **Git LFS 就绪**：`.gitattributes` 预配置了地形/模型/纹理等二进制大文件的跟踪规则，从一开始就避免仓库膨胀

---

## 🤝 扩展指南

### 接入真实后端

打开 [`src/mock/mockApi.ts`](src/mock/mockApi.ts)，将各函数内部实现替换为真实的 `fetch/axios` 调用即可。返回值类型请保持与现有 `interface` 一致，这样 `App.vue` 与所有子组件均**零代码改动**。

### 替换演示城市 / 坐标

- 修改默认相机位置与姿态：[`src/cesium/initViewer.ts#L70-L87`](src/cesium/initViewer.ts#L70-L87)
- 替换道路网：覆盖 `public/geojson/roadline.geojson`
- 替换区县热力图数据：修改 [`src/mock/geo-and-events.ts`](src/mock/geo-and-events.ts) 中 `REGION_MAP_DATA` 与对应 SVG path（若改省份需同步修改 `RegionMap.vue` 内的 SVG path id）
- 替换本地地形切片：将地形量化产物放入 `public/terrains/你的目录/` 并在 `initViewer` 内通过 `Cesium.Terrain.fromUrl` 加载

### 新增组件到 SmartDash

1. 在对应子目录（`cards/` / `charts/` / `interactive/` …）新建 `.vue` + 必要的类型
2. 若新增对外类型，追加到 [`components/shared/types.ts`](src/components/shared/types.ts)
3. 如有共享样式变量需要扩展，编辑 [`components/shared/theme.ts`](src/components/shared/theme.ts) 的 `themeVariables`
4. 在 [`components/index.ts`](src/components/index.ts) 中按需补充具名导出（可选，默认用户可按路径引入）

### 启用 Cesium Navigation 罗盘/缩放控件

项目依赖了 `cesium-navigation-es6`，但默认未启用。需要时在 `App.vue` 中 `initViewer()` 返回后调用：

```ts
import 'cesium-navigation-es6/dist/cesium-navigation.css';
import * as CesiumNavigation from 'cesium-navigation-es6';
// ...
CesiumNavigation(viewer, {
  enableCompass: true,
  enableZoomControls: true,
  enableDistanceLegend: true,
});
```

---

## 🛠️ 贡献指南

欢迎 Issue / PR！请遵循以下约定，让维护更高效：

### 提 Issue 前

1. 先在 [FAQ](#-faq--常见问题) 中搜索是否已有答案
2. 确认使用的 Node / npm / 浏览器版本符合要求
3. Bug Issue 请包含：
   - 复现步骤（从 `npm install` 到触发问题的每一步）
   - 预期行为 vs 实际行为
   - 环境信息（OS、浏览器版本、显卡、Node 版本）
   - Console 截图 / Network 报错截图

### 提交 PR

1. **Fork 本仓库**，基于 `main` 分支新建功能分支（推荐命名：`feat/xxx` / `fix/xxx` / `docs/xxx` / `refactor/xxx`）
2. 保持单 PR 单一职责，避免把多个不相关的改动塞进同一个 PR
3. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)：

   ```
   feat(cesium): 新增无人机轨迹飞行动画
   fix(roadlightline): 修复 sprite 纹理 repeat > 1 时 UV 错误
   docs(readme): 补充 GitHub Pages 部署步骤
   ```

4. 提交前本地跑通：

   ```bash
   npm run build   # 必须通过 vue-tsc + vite build
   ```

5. PR 描述请写清楚：
   - 解决了什么问题 / 新增了什么功能
   - 关联的 Issue 编号（如 `Closes #123`）
   - 必要时附截图 / 录屏

### 代码风格约定

- 语言：**TypeScript 严格模式**，新增公共 API 必须写完整参数 + 返回类型（不使用 `any`，除非明确标注原因）
- Vue：统一用 `<script setup lang="ts">`，props 用 `defineProps<PropsT>()` 的类型形式，不用运行时声明 + 泛型混用
- 命名：组件 `PascalCase.vue`、工具函数 `camelCase.ts`、类型前缀 `T/I` 视场景而定（本项目多用内联 interface）
- 格式化：推荐使用项目默认 VSCode 扩展（见 `.vscode/extensions.json`）

---

## 🗺️ 路线图 Roadmap

> 欢迎在 Issue 中补充你想要的功能，按点赞优先级排期 ✨

- [ ] **接入真实后端模板**：提供 Express / NestJS 两个版本的示例后端，接口形状与 `mockApi.ts` 完全同形
- [ ] **图层切换面板**：在中央浮层的 FilterChip 上真正实现 Cesium Entity / Primitive 的显隐联动
- [ ] **多点飞行漫游**：在 Timeline 上点选事件后相机自动飞到目标区县 / 地标
- [ ] **无人机轨迹回放**：把 `public/model/Air.glb` 真正投入使用，做时间驱动的航线动画 + 尾迹线
- [ ] **主题切换**：在 `shared/theme.ts` 基础上，再设计一套「暖色政务风」与「极简浅色风」主题一键切换
- [ ] **Storybook 文档化组件库**：把 SmartDash 的 18 个组件每个配独立 story，可视化 playground
- [ ] **i18n 中英双语**：对所有中文文案做国际化封装

---

## � 致谢 / Credits

没有以下开源项目与开放数据，本项目无法完成：

- 🌏 **[CesiumJS](https://github.com/CesiumGS/cesium)** (Apache-2.0) — 三维地球引擎基石
- 🏙️ **[OpenStreetMap](https://www.openstreetmap.org/)** × **[Cesium OSM Buildings](https://cesium.com/content/cesium-osm-buildings/)** — 全球 3D 建筑白模开放数据
- 🗺️ **地形切片数据** — 基于公开的 DEM 数据通过 `cesium-terrain-builder` 量化生成（广州覆盖区）
- 💚 **[Vue 3](https://github.com/vuejs/core)** (MIT) — 渐进式前端框架
- ⚡ **[Vite](https://github.com/vitejs/vite)** (MIT) — 下一代前端构建工具
- 🎨 大屏 UI 设计风格参考了市面上多个开源可视化项目的通用设计语言

> 若你认为本项目的某个资源使用方式超出了许可范围，请通过 Issue 告知，会第一时间移除或更换。

---

## �📄 License

本项目 **源码** 基于 **[MIT License](LICENSE)** 开源，你可以自由地使用、修改、分发、商用，**仅需**在你的衍生项目中保留本仓库的版权声明（详见 [`LICENSE`](LICENSE) 文件）。

**第三方资源**遵循各自的许可协议（与本项目 License 兼容）：
| 资源 | 许可证 |
| :--- | :--- |
| CesiumJS 引擎 | Apache-2.0 |
| OSM 3D 建筑 / 道路 GeoJSON（`roadline.geojson`） | ODbL 1.0（OpenStreetMap 数据） |
| 本地地形切片（`public/terrains/gz/`） | 源 DEM 数据遵循对应公开协议 |
| GLB 模型（Air.glb / pyramid.glb） | CC0 / 自建模（如有争议请提 Issue） |
| 天空盒 / 纹理贴图（`public/texture/`） | CC0 免费素材 |
