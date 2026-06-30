import * as Cesium from 'cesium';

/**
 * 道路流光效果 — Cesium 1.142 兼容实现
 *
 * 设计要点（旧版 → 新版的等价替换）：
 *   旧版 SpritelineMaterialProperty：
 *     - 依赖 Cesium.Material._materialCache（私有 API，已移除）
 *     - 注入 GLSL fabric.source 做 UV 动画
 *     - 使用 gsap.timeline 驱动 uniforms.uTime
 *   新版 RoadLightLine（本文件）：
 *     - 【数据加载】使用 public/geojson/roadline.geojson（旧版已验证的数据源）
 *                   通过 Cesium.GeoJsonDataSource.load + fetch JSON 两条路径兜底
 *     - 【可视化渲染】Cesium.GroundPolylinePrimitive + Appearance（PolylineMaterialAppearance）
 *                    不借助私有字段，全部走公开 API。每帧用 RequestAnimationFrame
 *                    驱动 `uniforms.uTime`，替代 gsap + 私有 shader 缓存。
 *     - 【效果一】流光（Flow Trail）：用 smoothstep + 窗口函数沿路径推进的 alpha 遮罩
 *                  等价旧版 PolylineTrailMaterialProperty（smoothstep(time-0.1,time,st.s)）
 *     - 【效果二】虚线扫掠（Sprite Dashed）：fract(st.s - uTime) + dash 贴图/噪声
 *                  等价旧版 SpritelineMaterialProperty + spriteline1.png（纹理走内置噪声）
 *     - 【交互】支持鼠标 picker 悬停高亮 / 点击选择 / destroy 销毁 / setSpeed / setColor
 *
 * 依赖：无 gsap；
 *   - flow 模式：无外部纹理（纯 GLSL 数学窗口）
 *   - sprite 模式：采样 public/texture/spriteline1.png（若用户放入该纹理，则自动生效；
 *     如未提供，则自动回退为「fract + step」的内置虚线算法，保证零依赖也可用）
 */

/* ============================================================
 *  一、类型定义
 * ==========================================================*/
export type RoadFlowStyle = 'flow' | 'sprite';

export interface RoadLightLineOptions {
  /** Cesium Viewer 实例 */
  viewer: Cesium.Viewer;
  /** GeoJSON 文件路径（Vite public 目录），默认 '/geojson/roadline.geojson' */
  geojsonUrl?: string;
  /**
   * sprite 模式专用：流光纹理图片路径（Vite public 目录）。
   * 默认 '/texture/spriteline1.png'；
   * 如需完全「无纹理」的数学虚线，显式传 textureUrl: ''（空字符串）。
   */
  textureUrl?: string;
  /** sprite 模式专用：纹理在横向重复几次（控制单段箭头长度），默认 1.0 */
  textureRepeat?: number;
  /** 流光颜色，默认荧光绿 #50FF80 半透明 */
  color?: Cesium.Color;
  /** 暗线颜色（未流光部分），默认同色低 alpha */
  baseColor?: Cesium.Color;
  /** 动画模式：flow = 流动光带；sprite = 虚线扫掠，默认 flow */
  style?: RoadFlowStyle;
  /** 流光窗口宽度（0~1，沿路径总长度比例），flow 模式用，默认 0.15 */
  headOffset?: number;
  /** 动画速度（每帧 uTime 增量），默认 0.0035 */
  speed?: number;
  /** 单像素线宽（GroundPrimitive width），默认 4px */
  width?: number;
  /** 是否抬升 20m 避免贴地时被建筑遮挡，默认 true */
  lift?: boolean;
  /** 抬升高度（米），默认 20 */
  liftHeight?: number;
  /** 是否打印调试日志，默认 false */
  debug?: boolean;
}

interface RoadFeature {
  /** GeoJSON feature.id，用于 picker 回查 */
  id: number | string;
  /** GeoJSON properties */
  properties: Record<string, unknown>;
  /** 拆分成的多段 positions（每段 2 个点构成小线段） */
  segments: Array<[Cesium.Cartesian3, Cesium.Cartesian3]>;
  /** 该 feature 总线段数 */
  segmentCount: number;
  /** 相位偏移（0~1），让不同道路错相流动 */
  phase: number;
  /** 当前高亮状态（hover 或 selected） */
  highlight: boolean;
}

const DEFAULT_OPTIONS = {
  viewer: null as unknown as Cesium.Viewer,
  geojsonUrl: '/geojson/roadline.geojson',
  textureUrl: '/texture/spriteline1.png',
  textureRepeat: 1.0,
  color: Cesium.Color.fromCssColorString('#50FF80'),
  baseColor: Cesium.Color.fromCssColorString('#50FF80').withAlpha(0.18),
  style: 'flow' as RoadFlowStyle,
  headOffset: 0.15,
  speed: 0.0035,
  width: 4,
  lift: true,
  liftHeight: 20,
  debug: false,
} as const satisfies Required<RoadLightLineOptions>;

/* ============================================================
 *  二、工具函数：GLSL 片段与 GeoJSON 解析
 * ==========================================================*/

/**
 * 生成 polyline 着色器片段（Cesium Fabric 材质用的 source）。
 *  重要：uniforms 必须让 Fabric 自动声明 —— 不要在 source 里自己写 uniform 声明，
 *        否则会与 Fabric 根据 uniforms 对象类型推断出的声明重复 / 类型不一致。
 *  重要：WebGL2 / GLSL 300 es 下 texture2D / textureCube 已被移除，统一换成内建宏
 *        CZM_TEXTURE_2D(sampler, uv)（Cesium 在 #version 前后注入兼容 macro），
 *        避免运行时因设备 WebGL 版本自动切换导致 Fragment shader failed to compile。
 *
 *   flow   —— smoothstep 光带推进（等价旧版 PolylineTrailMaterial）
 *   sprite —— 子分支：
 *              spriteHasTexture = true
 *                → 使用 Fabric 保留键 image（sampler2D），等价旧版 SpritelineMaterialProperty：
 *                  CZM_TEXTURE_2D(image, fract((st.s - t) * uRepeat), st.t)
 *              spriteHasTexture = false
 *                → 数学虚线 fallback，完全不依赖外部贴图
 *
 *   Fabric 自动声明的 uniforms（来自 uniforms 对象的键/类型）：
 *     float uTime / vec4  uColor / vec4  uBaseColor
 *     float uHead（flow）/ float uRepeat（sprite）
 *     float uPhase       / float uHighlight
 *     sampler2D image  （仅 sprite + 有纹理时由 Fabric 注入，键名必须叫 image）
 */
function buildFragmentShader(style: RoadFlowStyle, spriteHasTexture: boolean): string {
  // Cesium 注入 CZM_TEXTURE_2D 宏兼容 WebGL1/2（GLSL100 用 texture2D，GLSL300 es 用 texture）。
  // 为避免 macro 未定义时（老版 Cesium 或特殊 pipeline）仍能编译，自行兜底：
  const compatHeader = /* glsl */ `
    #ifndef CZM_TEXTURE_2D
      #if __VERSION__ >= 300
        #define CZM_TEXTURE_2D(sampler, uv) texture(sampler, uv)
      #else
        #define CZM_TEXTURE_2D(sampler, uv) texture2D(sampler, uv)
      #endif
    #endif
  `;

  const materialFnOpen = /* glsl */ `
    czm_material czm_getMaterial(czm_materialInput materialInput) {
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;

      float t = fract(uTime + uPhase);
  `;

  const flowLogic = /* glsl */ `
      // 窗口 [t - uHead, t] 内为光带；用 smoothstep 做边缘羽化
      float head   = t;
      float tail   = head - uHead;
      float inside = step(tail, st.s) * step(st.s, head);
      // 环扣：head < uHead（窗口跨 0 边界）
      inside = inside
        + step(head, uHead) * (step(st.s, head) + step(tail + 1.0, st.s));
      float edgeIn  = smoothstep(tail,                 tail + uHead * 0.3, st.s + (tail < 0.0 ? 1.0 : 0.0));
      float edgeOut = 1.0 - smoothstep(head - uHead * 0.3, head, st.s);
      float feather = clamp(edgeIn * edgeOut, 0.0, 1.0);

      float aBase = uBaseColor.a;
      vec3  col   = mix(uBaseColor.rgb, uColor.rgb, inside);
      float alpha = mix(aBase, uColor.a, inside * feather + 0.2 * inside);
      // 高亮：整体再加亮 + 加宽（加宽用 alpha 模拟）
      col   = mix(col,   uColor.rgb, uHighlight * 0.4);
      alpha = mix(alpha, uColor.a,   uHighlight * 0.5);

      material.alpha    = alpha;
      material.diffuse  = col;
      material.emission = col * (0.35 + 0.45 * inside + 0.3 * uHighlight);
  `;

  // sprite 模式：有纹理 → 旧版 texture2D(image, fract(st.s-uTime), st.t) 精确还原，
  //            但调用 CZM_TEXTURE_2D 宏保证 WebGL1/WebGL2 双版本 GLSL 兼容
  const spriteLogic = spriteHasTexture
    ? /* glsl */ `
      vec2 uv = vec2(fract((st.s - t) * uRepeat), st.t);
      vec4 tex = CZM_TEXTURE_2D(image, uv);

      // 底：uBaseColor；面：tex.rgb * uColor.rgb 做染色 + tex.a 做遮罩
      vec3  texCol    = tex.rgb * uColor.rgb;
      float texMask   = tex.a;
      vec3  col       = mix(uBaseColor.rgb, texCol, texMask);
      float alpha     = mix(uBaseColor.a, max(uColor.a, tex.a), texMask);
      // 高亮
      col   = mix(col,   uColor.rgb, uHighlight * 0.4);
      alpha = mix(alpha, uColor.a,   uHighlight * 0.5);

      material.alpha    = alpha;
      material.diffuse  = col;
      material.emission = col * (0.3 + 0.45 * texMask + 0.35 * uHighlight);
  `
    : /* glsl */ `
      // 无纹理回退：fract 数学虚线
      float dash = fract(st.s * 2.0 * uRepeat - fract(uTime + uPhase));
      float on   = step(dash, 0.25);
      float soft = 1.0 - smoothstep(0.0, 0.25, dash);

      vec3  col   = mix(uBaseColor.rgb, uColor.rgb, on);
      float alpha = mix(uBaseColor.a, uColor.a, on * 0.6 + 0.05) * (0.75 + 0.25 * soft);
      col   = mix(col,   uColor.rgb, uHighlight * 0.4);
      alpha = mix(alpha, uColor.a,   uHighlight * 0.5);

      material.alpha    = alpha;
      material.diffuse  = col;
      material.emission = col * (0.25 + 0.35 * on + 0.35 * uHighlight);
  `;

  const end = /* glsl */ `
      return material;
    }
  `;

  return compatHeader + materialFnOpen + (style === 'flow' ? flowLogic : spriteLogic) + end;
}

/** 解析一个 GeoJSON Feature 为 RoadFeature（拆分多段 + 抬升 + 相位分配） */
function parseFeature(
  geojsonFeature: {
    type: 'Feature';
    id?: number | string;
    properties?: Record<string, unknown> | null;
    geometry: { type: 'LineString'; coordinates: number[][] };
  },
  lift: boolean,
  liftHeight: number,
  phase: number,
): RoadFeature | null {
  const coords = geojsonFeature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null; // 1 个点的线无法成段（如 id 54821 / 94835）

  const h = lift ? liftHeight : 0;
  const cartesians = coords.map((c) => {
    // c: [lon, lat] 或 [lon, lat, alt]
    const alt = c.length >= 3 ? (c[2] as number) + h : h;
    return Cesium.Cartesian3.fromDegrees(c[0], c[1], alt);
  });

  const segments: Array<[Cesium.Cartesian3, Cesium.Cartesian3]> = [];
  for (let i = 0; i < cartesians.length - 1; i++) {
    segments.push([cartesians[i], cartesians[i + 1]]);
  }

  return {
    id: geojsonFeature.id ?? Math.random().toString(36).slice(2),
    properties: { ...(geojsonFeature.properties ?? {}) },
    segments,
    segmentCount: segments.length,
    phase,
    highlight: false,
  };
}

/* ============================================================
 *  三、主类
 * ==========================================================*/
export default class RoadLightLine {
  private readonly viewer: Cesium.Viewer;
  private readonly geojsonUrl: string;
  /** sprite 模式：纹理路径（空字符串 → 无纹理数学虚线） */
  private readonly textureUrl: string;
  /** sprite 模式：纹理横向重复次数（越大 → 每个箭头越短） */
  private textureRepeat: number;
  /** 运行期标志：当前 sprite 模式是否真的启用了纹理 */
  private spriteHasTexture: boolean = false;
  private color: Cesium.Color;
  private baseColor: Cesium.Color;
  private readonly style: RoadFlowStyle;
  private headOffset: number;
  private speed: number;
  private readonly width: number;
  private readonly debug: boolean;

  private readonly primitives: Cesium.Primitive[] = [];
  /**
   * 每个 primitive 对应的 uniforms（按 feature 顺序）。
   * 注：uImage 若存在则只放在 fabric.uniforms 里（由 Cesium 纹理系统自动管理），
   *    不在每帧同步循环中更新，因此这里不强制声明它。
   */
  private readonly uniforms: Array<{
    uTime: number;
    uColor: Cesium.Color;
    uBaseColor: Cesium.Color;
    uHead: number;
    uRepeat: number;
    uPhase: number;
    uHighlight: number;
  }> = [];

  private features: RoadFeature[] = [];
  private rafId: number | null = null;
  private selectedId: number | string | null = null;
  private hoverId: number | string | null = null;
  private handler: Cesium.ScreenSpaceEventHandler | null = null;

  private readonly readyPromise: Promise<void>;

  /* ──────────────── 构造 ──────────────── */
  constructor(options: RoadLightLineOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.viewer = opts.viewer;
    this.geojsonUrl = opts.geojsonUrl;
    this.textureUrl = opts.textureUrl;
    this.textureRepeat = opts.textureRepeat;
    this.color = opts.color;
    this.baseColor = opts.baseColor;
    this.style = opts.style;
    this.headOffset = opts.headOffset;
    this.speed = opts.speed;
    this.width = opts.width;
    this.debug = opts.debug;

    // 启动加载
    this.readyPromise = this.init();
  }

  /** ready 时 resolve；外部可 await roadLightLine.ready 等待加载完成 */
  get ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * 预检查 sprite 纹理是否能加载；返回 true = 可用。
   * 这里故意「先 fetch → 再交给 fabric 去 load」保证 fabric 读图片命中浏览器 HTTP 缓存，
   * 不会重复下载，同时避免 Cesium 纹理加载失败时出现「整屏没有道路」的体验断层。
   */
  private async probeSpriteTexture(): Promise<boolean> {
    if (this.style !== 'sprite') return false;
    if (!this.textureUrl) return false;
    try {
      // 用 Image 请求（更贴近 Cesium 内部的实际加载方式）
      await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = this.textureUrl;
      });
      return true;
    } catch (e) {
      if (this.debug) {
        console.warn(`[RoadLightLine] sprite 纹理加载失败 ${this.textureUrl}，回退为数学虚线：`, e);
      }
      return false;
    }
  }

  /* ──────────────── 初始化：GeoJSON 解析 + 纹理检查 + primitive 构建 ──────────────── */
  private async init(): Promise<void> {
    const [features, texOk] = await Promise.all([this.loadGeoJson(), this.probeSpriteTexture()]);
    this.features = features;
    this.spriteHasTexture = this.style === 'sprite' && texOk;

    if (this.debug) {
      console.log(`[RoadLightLine] 解析到 ${features.length} 条有效道路；sprite纹理=${this.spriteHasTexture ? '已启用' : '已回退为数学虚线'}`);
    }

    this.buildPrimitives();
    this.bindInteractions();
    this.startAnimation();
  }

  /**
   * 加载 GeoJSON：优先用 `fetch(geojsonUrl)`（避免 GeoJsonDataSource
   * 带 viewer.dataSources 隐式加载带来的额外实体污染），解析失败时兜底
   * 到 Cesium.GeoJsonDataSource.load 再 fallback。
   */
  private async loadGeoJson(): Promise<RoadFeature[]> {
    const lift = (DEFAULT_OPTIONS as Required<RoadLightLineOptions>).lift;
    const liftH = (DEFAULT_OPTIONS as Required<RoadLightLineOptions>).liftHeight;

    // 路径 1：fetch + 原生 JSON.parse
    try {
      const res = await fetch(this.geojsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        type: 'FeatureCollection';
        features: Array<{
          type: 'Feature';
          id?: number | string;
          properties?: Record<string, unknown> | null;
          geometry: { type: 'LineString'; coordinates: number[][] };
        }>;
      };

      const result: RoadFeature[] = [];
      json.features.forEach((f, idx) => {
        if (f.geometry?.type !== 'LineString') return;
        const phase = idx / Math.max(1, json.features.length);
        const parsed = parseFeature(f, lift, liftH, phase);
        if (parsed) result.push(parsed);
      });
      return result;
    } catch (err) {
      if (this.debug) {
        console.warn('[RoadLightLine] fetch 直读 GeoJSON 失败，回退到 GeoJsonDataSource：', err);
      }
      // 路径 2：Cesium.GeoJsonDataSource.load 兜底
      const ds = await Cesium.GeoJsonDataSource.load(this.geojsonUrl);
      const entities = ds.entities.values;
      const result: RoadFeature[] = [];
      entities.forEach((e, idx) => {
        const posProp = e.polyline?.positions;
        if (!posProp) return;
        // polyline.positions 在 Cesium 类型里是 Property | Cartesian3[]；
        // 对 GeoJSON 加载的实体一般都是 ConstantProperty<Cartesian3[]>, 此处统一解析
        let positionsArr: Cesium.Cartesian3[];
        if (posProp instanceof Cesium.ConstantProperty) {
          positionsArr = posProp.getValue(Cesium.JulianDate.now()) as Cesium.Cartesian3[];
        } else if (Array.isArray(posProp)) {
          positionsArr = posProp;
        } else if (typeof (posProp as Cesium.Property).getValue === 'function') {
          positionsArr = (posProp as Cesium.Property).getValue(Cesium.JulianDate.now()) as Cesium.Cartesian3[];
        } else {
          return;
        }
        if (!Array.isArray(positionsArr)) return;
        // 构造一个假的 geojson feature
        const coords = positionsArr.map((p: Cesium.Cartesian3) => {
          const c = Cesium.Cartographic.fromCartesian(p);
          return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude), c.height] as number[];
        });
        const rawProps = e.properties;
        let props: Record<string, unknown> = {};
        if (rawProps instanceof Cesium.ConstantProperty) {
          props = (rawProps.getValue(Cesium.JulianDate.now()) ?? {}) as Record<string, unknown>;
        } else if (typeof (rawProps as Cesium.PropertyBag | undefined)?.getProperty === 'function') {
          for (const k of (rawProps as Cesium.PropertyBag).propertyNames ?? []) {
            const val = (rawProps as Cesium.PropertyBag).getProperty(k);
            if (val instanceof Cesium.ConstantProperty) props[k] = val.getValue(Cesium.JulianDate.now());
            else props[k] = val;
          }
        } else if (rawProps && typeof rawProps === 'object' && !Array.isArray(rawProps)) {
          props = rawProps as Record<string, unknown>;
        }
        const parsed = parseFeature(
          {
            type: 'Feature',
            id: e.id,
            properties: props,
            geometry: { type: 'LineString', coordinates: coords },
          },
          lift,
          liftH,
          idx / Math.max(1, entities.length),
        );
        if (parsed) result.push(parsed);
      });
      return result;
    }
  }

  /** 为每个 feature 构建 1 个 PolylineGeometry + Primitive（便于每个 feature 独立 phase / highlight） */
  private buildPrimitives(): void {
    const { scene } = this.viewer;

    this.features.forEach((feat, i) => {
      const allPositions: Cesium.Cartesian3[] = [];
      // 把所有段合并为一条折线（每个 feature = 一条连续 polyline），
      // Cesium 会按 positions 顺序连续绘制；st.s 自动沿整条线 0→1 分布，
      // 恰好满足 shader 中 flow 基于 st.s 的窗口函数 / sprite 基于 st.s 的纹理采样。
      feat.segments.forEach(([a, b], segIdx) => {
        allPositions.push(a);
        if (segIdx === feat.segments.length - 1) allPositions.push(b);
      });

      if (allPositions.length < 2) return;

      // Fabric uniforms：用 Cesium Material 能识别的类型声明全部 uniforms；
      //   - sprite + 有纹理 ：使用 Fabric 保留键 image = URL 字符串，
      //                        Cesium 会自动声明 uniform sampler2D image 并异步加载纹理。
      //   - Color / float    ：Fabric 根据 JS 值类型自动声明 vec4 / float。
      // 创建完成后我们再把 material.uniforms 的 live reference 存回 this.uniforms[i]，
      // 确保每帧写入直接进入 Cesium 每帧读取的 uniforms 容器（修复动画静默无效的风险）。
      const initialUniforms: Record<string, unknown> = {
        uTime: 0,
        uColor: Cesium.Color.clone(this.color),
        uBaseColor: Cesium.Color.clone(this.baseColor),
        uHead: this.headOffset,
        uRepeat: this.textureRepeat,
        uPhase: feat.phase,
        uHighlight: 0,
      };
      if (this.style === 'sprite' && this.spriteHasTexture) {
        initialUniforms.image = this.textureUrl;
      }
      const fs = buildFragmentShader(this.style, this.spriteHasTexture);

      const material = new Cesium.Material({
        fabric: {
          type: `RoadLightLine_${this.style}${this.spriteHasTexture ? 'T' : 'M'}_f${i}_${(Math.random() * 1e6).toFixed(0)}`,
          uniforms: initialUniforms,
          source: fs,
        },
        translucent: true,
      });

      const appearance = new Cesium.PolylineMaterialAppearance({
        material,
        translucent: true,
      });

      // 取 live uniforms 引用（Cesium 每帧 bind uniforms 时读这个对象）
      const liveUniforms = material.uniforms;
      this.uniforms[i] = liveUniforms;

      const geometry = new Cesium.PolylineGeometry({
        positions: allPositions,
        width: this.width,
        vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
        arcType: Cesium.ArcType.NONE,
      });

      const instance = new Cesium.GeometryInstance({
        geometry,
        id: { roadId: feat.id, featureIndex: i },
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE),
        },
      });

      const primitive = new Cesium.Primitive({
        geometryInstances: instance,
        appearance,
        asynchronous: true,
        compressVertices: true,
        releaseGeometryInstances: false, // 保留以方便 picker 回查 id
      });
      // 额外存 live uniforms 引用（交互层通过 __uniforms 更新时写进同一份 material.uniforms）
      (primitive as unknown as { __uniforms: typeof liveUniforms; __featureIndex: number }).__uniforms = liveUniforms;
      (primitive as unknown as { __uniforms: typeof liveUniforms; __featureIndex: number }).__featureIndex = i;

      scene.primitives.add(primitive);
      this.primitives.push(primitive);
    });
  }

  /* ──────────────── 动画循环 ──────────────── */
  private startAnimation(): void {
    const step = () => {
      const N = this.primitives.length;
      for (let i = 0; i < N; i++) {
        const u = this.uniforms[i];
        if (!u) continue;
        u.uTime = (u.uTime + this.speed) % 1.0;
        // 同步每帧可能变化的外部参数
        u.uHead = this.headOffset;
        u.uRepeat = this.textureRepeat;
        Cesium.Color.clone(this.color, u.uColor);
        Cesium.Color.clone(this.baseColor, u.uBaseColor);

        // uHighlight：根据 hover / selected 更新
        const feat = this.features[i];
        u.uHighlight = feat.highlight ? 1.0 : 0.0;
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  /* ──────────────── 交互：hover / click ──────────────── */
  private bindInteractions(): void {
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    // Hover：修改光标
    this.handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      const pick = this.viewer.scene.pick(movement.endPosition);
      const roadId = pick?.id?.roadId as number | string | undefined;
      const newHover = roadId ?? null;

      if (newHover !== this.hoverId) {
        // 清空旧 hover
        if (this.hoverId !== null) {
          const f = this.features.find((x) => x.id === this.hoverId && x.id !== this.selectedId);
          if (f) f.highlight = false;
        }
        // 设定新 hover
        if (newHover !== null) {
          const f = this.features.find((x) => x.id === newHover);
          if (f) f.highlight = true;
          this.viewer.scene.canvas.style.cursor = 'pointer';
        } else {
          this.viewer.scene.canvas.style.cursor = '';
        }
        this.hoverId = newHover;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Click：选中高亮 + 触发回调（如果外部通过 onRoadClick 挂载）
    this.handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const pick = this.viewer.scene.pick(movement.position);
      const roadId = pick?.id?.roadId as number | string | undefined;
      const feat = roadId !== undefined ? this.features.find((f) => f.id === roadId) : undefined;

      // 清空前一个 selected
      if (this.selectedId !== null) {
        const prev = this.features.find((x) => x.id === this.selectedId);
        if (prev) prev.highlight = prev.id === this.hoverId;
      }
      this.selectedId = roadId ?? null;
      if (feat) {
        feat.highlight = true;
        if (this.debug) {
          console.log('[RoadLightLine] 点击道路:', feat.id, 'properties:', feat.properties, 'segments:', feat.segmentCount);
        }
        this.onRoadClick?.(feat.id, feat.properties);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  /** 外部可注入：道路点击回调（id + properties） */
  public onRoadClick: ((id: number | string, properties: Record<string, unknown>) => void) | null = null;

  /* ──────────────── 公共 API ──────────────── */

  /** 调整流光速度（每帧增量） */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /** 更换流光主色；暗线颜色使用同色低 alpha 自动生成 */
  setColor(color: Cesium.Color, baseColor?: Cesium.Color): void {
    this.color = color;
    this.baseColor = baseColor ?? color.withAlpha(0.18);
  }

  /** 调整 flow 模式光带宽度（0~1） */
  setHeadOffset(offset: number): void {
    this.headOffset = Math.max(0.01, Math.min(1, offset));
  }

  /**
   * 调整 sprite 模式的纹理重复次数（控制每个箭头的长度）。
   *   repeat = 1.0：纹理完整拉伸到每条路的长度（箭头最宽最清晰，和旧版 SpritelineMaterialProperty 默认一致）
   *   repeat = 3.0：每条路上出现 3 个循环的箭头段
   *   repeat = 0.3：一个箭头横跨 3 条路的视觉长度
   */
  setTextureRepeat(repeat: number): void {
    this.textureRepeat = Math.max(0.05, repeat);
  }

  /** 当前选中的道路 id（未选中为 null） */
  getSelectedId(): number | string | null {
    return this.selectedId;
  }

  /** 所有 features 只读访问（供外部数据消费） */
  getFeatureSnapshot(): Array<{ id: number | string; properties: Record<string, unknown>; segmentCount: number }> {
    return this.features.map((f) => ({ id: f.id, properties: { ...f.properties }, segmentCount: f.segmentCount }));
  }

  /** 销毁：取消动画、移除 primitives、清空事件监听 */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }
    this.primitives.forEach((p) => {
      if (!this.viewer.scene.primitives.isDestroyed()) {
        try { this.viewer.scene.primitives.remove(p); } catch (_) { /* ignore */ }
      }
    });
    this.primitives.length = 0;
    this.uniforms.length = 0;
    this.features = [];
    this.selectedId = null;
    this.hoverId = null;
    this.viewer.scene.canvas.style.cursor = '';
  }
}
