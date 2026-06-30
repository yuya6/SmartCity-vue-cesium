import * as Cesium from 'cesium';

/**
 * LightCone 光锥/金字塔（四棱锥 GLB 模型 + 上下悬浮 + 绕 Z 轴来回旋转）
 *
 * 适配自旧版 LightCone.js 的 TypeScript 增强版：
 *   - 修复旧版拼写错误：`params.degress` → `params.heading`（语义也更准确，对应 HeadingPitchRoll.heading）
 *   - 不再强制依赖 gsap：内置等价于 `gsap.to({ ease: 'power1.inOut', yoyo: true, repeat: -1 })` 的 tween 实现，
 *     零额外依赖，若项目之后安装了 gsap 也可通过自定义 animate 函数接入
 *   - Cesium 1.118+ 兼容性：使用官方推荐的 `Cesium.Model.fromGltfAsync()`（Model 2.0 管线）
 *     替代旧版已废弃的 `Model.fromGltf`，加载期间动画照常运行，模型 ready 后自动出现在场景中
 *   - 新增 `readyPromise`、`destroy()`、`pause()` 等生命周期 API，支持资源清理与多实例复用
 *   - 支持构造参数覆盖经纬度、高度、颜色、模型 URL、缩放、动画周期等
 */
export interface LightConeOptions {
  /** 基座点经度（WGS84 十进制度），默认 113.3191（广州塔附近） */
  longitude?: number;
  /** 基座点纬度（WGS84 十进制度），默认 23.109（广州塔附近） */
  latitude?: number;
  /** 初始高度（椭球高，米），默认 700，动画起点 */
  initialHeight?: number;
  /** 动画目标高度（椭球高，米），默认 800 */
  targetHeight?: number;
  /** 初始 heading（弧度，绕 Z 轴逆时针为正），默认 0，动画起点 */
  initialHeading?: number;
  /** 动画目标 heading（弧度），默认 Math.PI（半圈） */
  targetHeading?: number;
  /** 单向动画时长（秒），yoyo 往返总时长 = 2 * durationPerDirection。默认 1（与旧版 duration:1 对齐） */
  durationPerDirection?: number;
  /** GLB 模型 URL，默认 `/model/pyramid.glb`（Vite public 目录下已存在） */
  modelUrl?: string;
  /** 模型缩放倍数，默认 200 */
  scale?: number;
  /** 最小像素尺寸（屏幕上缩放到至少多少像素），默认 12 */
  minimumPixelSize?: number;
  /** 最大缩放倍数上限，默认 20000 */
  maximumScale?: number;
  /** 模型颜色 + 透明度，默认 Cesium.Color.YELLOW.withAlpha(0.5) */
  color?: Cesium.Color;
  /**
   * 颜色混合模式，默认 Cesium.ColorBlendMode.REPLACE。
   *  - REPLACE：完全丢弃 GLB 原色，强制使用配置的 color，保证无贴图几何体面不发黑。
   *  - MIX / HIGHLIGHT：保留部分原色，适合有 PBR 贴图的高质量模型。
   */
  colorBlendMode?: Cesium.ColorBlendMode;
  /** colorBlendAmount 数值，默认 1.0。与 REPLACE 搭配为 1.0；与 MIX 搭配可设 0~1 之间。 */
  colorBlendAmount?: number;
  /** 创建后是否自动开启动画，默认 true */
  autoAnimate?: boolean;
}

/**
 * 默认值，与旧版 LightCone.js 硬编码完全对齐。
 */
const DEFAULT_OPTIONS = {
  longitude: 113.3191,
  latitude: 23.109,
  initialHeight: 700,
  targetHeight: 800,
  initialHeading: 0,
  targetHeading: Math.PI,
  durationPerDirection: 1,
  modelUrl: `${import.meta.env.BASE_URL}model/pyramid.glb`,
  scale: 200,
  minimumPixelSize: 12,
  maximumScale: 20000,
  color: Cesium.Color.YELLOW.withAlpha(0.5),
  colorBlendMode: Cesium.ColorBlendMode.REPLACE,
  colorBlendAmount: 1.0,
  autoAnimate: true,
} as const satisfies Required<LightConeOptions>;

export default class LightCone {
  /**
   * 外部可读写：当前高度 + 当前 heading（每帧动画更新，等价于旧版 this.params）
   * 注意：`params` 引用本身不可重新赋值（readonly），但 height / heading 字段可修改，修改后下一次 raf 会应用到 modelMatrix。
   */
  public readonly params: {
    height: number;
    /** 修复旧版拼写 "degress" → "heading"，语义与 HeadingPitchRoll.heading 一致（弧度） */
    heading: number;
    /**
     * 兼容旧版 JS 中拼错的字段名 degress，等价于 heading。
     * 新代码请不要使用该字段，已标注 @deprecated。
     * @deprecated 请使用 heading（修复了拼写错误，语义更准）
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    degress: number;
  };

  /**
   * Cesium 中的 Model 实例（fromGltfAsync 异步加载，初始为 null）。
   * 若需在模型 ready 后再做操作，请 await `lightCone.readyPromise`。
   */
  public model: Cesium.Model | null = null;

  /**
   * 模型加载完成的 Promise，resolve 值为已加入 primitives 且 ready 可渲染的 Cesium.Model 实例。
   * 若构造阶段加载失败则 reject，错误信息可通过 try/catch 捕获。
   */
  public readonly readyPromise: Promise<Cesium.Model>;

  private readonly viewer: Cesium.Viewer;
  private readonly options: Required<LightConeOptions>;
  private rafId: number | null = null;
  private destroyed = false;

  constructor(viewer: Cesium.Viewer, options: LightConeOptions = {}) {
    if (!viewer?.scene?.primitives) {
      throw new Error('[LightCone] 构造参数 viewer.scene.primitives 非法，请传入有效的 Cesium.Viewer 实例。');
    }
    this.viewer = viewer;
    this.options = {
      longitude: options.longitude ?? DEFAULT_OPTIONS.longitude,
      latitude: options.latitude ?? DEFAULT_OPTIONS.latitude,
      initialHeight: options.initialHeight ?? DEFAULT_OPTIONS.initialHeight,
      targetHeight: options.targetHeight ?? DEFAULT_OPTIONS.targetHeight,
      initialHeading: options.initialHeading ?? DEFAULT_OPTIONS.initialHeading,
      targetHeading: options.targetHeading ?? DEFAULT_OPTIONS.targetHeading,
      durationPerDirection: options.durationPerDirection ?? DEFAULT_OPTIONS.durationPerDirection,
      modelUrl: options.modelUrl ?? DEFAULT_OPTIONS.modelUrl,
      scale: options.scale ?? DEFAULT_OPTIONS.scale,
      minimumPixelSize: options.minimumPixelSize ?? DEFAULT_OPTIONS.minimumPixelSize,
      maximumScale: options.maximumScale ?? DEFAULT_OPTIONS.maximumScale,
      color: options.color ?? DEFAULT_OPTIONS.color,
      colorBlendMode: options.colorBlendMode ?? DEFAULT_OPTIONS.colorBlendMode,
      colorBlendAmount: options.colorBlendAmount ?? DEFAULT_OPTIONS.colorBlendAmount,
      autoAnimate: options.autoAnimate ?? DEFAULT_OPTIONS.autoAnimate,
    };

    // 初始化 params（与旧版 this.params 等价，但修正了 degress 拼写）
    const paramsStore = {
      height: this.options.initialHeight,
      heading: this.options.initialHeading,
    };
    this.params = Object.defineProperties({} as typeof paramsStore & { degress: number }, {
      height: {
        get: () => paramsStore.height,
        set: (v: number) => {
          paramsStore.height = v;
        },
        configurable: false,
        enumerable: true,
      },
      heading: {
        get: () => paramsStore.heading,
        set: (v: number) => {
          paramsStore.heading = v;
        },
        configurable: false,
        enumerable: true,
      },
      degress: {
        get: () => paramsStore.heading,
        set: (v: number) => {
          paramsStore.heading = v;
        },
        configurable: true,
        enumerable: false,
      },
    }) as LightCone['params'];

    // 异步加载模型：Cesium 1.118+ 推荐使用 fromGltfAsync（构造函数不能直接返回 Promise，使用 readyPromise 暴露）
    this.readyPromise = this.loadModelAsync();

    // 自动开启动画（默认 true，与旧版构造函数末尾 this.animate() 等价）
    // 注意：animate() 在模型 ready 前每帧不会报错（applyModelMatrix 里会判空），模型加载完成后会自动继承当前 params 的位置姿态
    if (this.options.autoAnimate) {
      this.animate();
    }
  }

  /**
   * 异步加载 GLB 模型并加入场景，返回 ready 的 Cesium.Model。
   * 模型 ready 后会立即用当前 params 同步一次 modelMatrix，保证位置正确。
   */
  private async loadModelAsync(): Promise<Cesium.Model> {
    if (this.destroyed) {
      throw new Error('[LightCone] 已调用 destroy()，拒绝继续加载模型。');
    }
    const initialMatrix = this.computeModelMatrix();

    // ===== 修复 pyramid.glb 纯黑 =====
    // Cesium 1.118+ 的 Model 2.0 默认开启 PBR + IBL（Image Based Lighting，天空/大气/星星光照）。
    // 无贴图的简单几何体（如 pyramid.glb）在缺少 IBL 环境贴图时，PBR 着色器会输出近似黑色。
    // 创建 ImageBasedLighting 实例（构造函数 0 参数，属性通过赋值修改），
    // 用 imageBasedLightingFactor = (0, 0) 彻底关闭 IBL 贡献，配合 colorBlendMode:REPLACE + colorBlendAmount:1.0，
    // 强制模型最终颜色 = 配置的 color（YELLOW.withAlpha(0.5)），与 GLB 原材质、光照无关。
    const ibl = new Cesium.ImageBasedLighting();
    ibl.imageBasedLightingFactor = new Cesium.Cartesian2(0, 0);

    const model = await Cesium.Model.fromGltfAsync({
      url: this.options.modelUrl,
      show: true,
      modelMatrix: initialMatrix,
      scale: this.options.scale,
      minimumPixelSize: this.options.minimumPixelSize,
      maximumScale: this.options.maximumScale,
      debugShowBoundingVolume: false,
      debugWireframe: false,
      color: this.options.color,
      colorBlendMode: this.options.colorBlendMode,  // 默认 REPLACE
      colorBlendAmount: this.options.colorBlendAmount, // 默认 1.0
      imageBasedLighting: ibl,
      backFaceCulling: false, // pyramid.glb 若法线缺失，关闭背面裁剪避免一半面被裁掉导致"缺块"
      // 必须传 scene，否则 colorBlendMode / silhouette / customShader 等部分特性可能不生效
      scene: this.viewer.scene,
    });
    if (this.destroyed) {
      model.destroy?.();
      throw new Error('[LightCone] 模型加载完成前实例已被 destroy()，已丢弃加载结果。');
    }
    this.model = this.viewer.scene.primitives.add(model) as Cesium.Model;

    // ========== 保底：异步 ready 后再强制赋值一遍 ==========
    // fromGltfAsync 在内部加载并 ready 的过程中，Cesium 有时会覆盖传入的 color / ibl 参数，
    // 此处直接对已加入 scene 的 model 实例再强制赋值一遍，确保不被覆盖，彻底解决"光锥纯黑"。
    const m = this.model;
    if (m.imageBasedLighting != null) {
      m.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(0, 0);
    }
    m.color           = this.options.color;
    m.colorBlendMode  = this.options.colorBlendMode;
    m.colorBlendAmount= this.options.colorBlendAmount;
    m.backFaceCulling = false;

    this.applyModelMatrix();
    return this.model;
  }

  /**
   * 根据当前经纬度 + params.height + params.heading 计算模型的 ECEF 变换矩阵。
   * 等价于旧版 `Cesium.Transforms.headingPitchRollToFixedFrame(...)` 的调用。
   */
  private computeModelMatrix(): Cesium.Matrix4 {
    return Cesium.Transforms.headingPitchRollToFixedFrame(
      Cesium.Cartesian3.fromDegrees(this.options.longitude, this.options.latitude, this.params.height),
      new Cesium.HeadingPitchRoll(this.params.heading, 0, 0),
    );
  }

  /**
   * 手动更新 params 后，强制同步一次 modelMatrix 到 Cesium。
   * 一般无需显式调用：animate() 每帧会自动同步；若暂停动画时手动改了 params，可显式调一次。
   */
  public applyModelMatrix(): void {
    if (this.destroyed || !this.model) return;
    this.model.modelMatrix = this.computeModelMatrix();
  }

  /**
   * 启动 yoyo 往返动画：高度在 initialHeight ↔ targetHeight 之间、
   * heading 在 initialHeading ↔ targetHeading 之间按 easeInOutQuad (power1.inOut) 来回循环。
   *
   * 等价于旧版：
   *   gsap.to(this.params, {
   *     height: 800, degress: Math.PI, yoyo: true, repeat: -1, duration: 1,
   *     ease: 'power1.inOut', onUpdate: () => { this.model.modelMatrix = ... }
   *   });
   */
  public animate(): void {
    if (this.destroyed || this.rafId !== null) return;

    const { initialHeight, targetHeight, initialHeading, targetHeading, durationPerDirection } = this.options;
    const durationMs = durationPerDirection * 1000; // 单向毫秒
    const cycleMs = durationMs * 2; // 一个往返（前进 + 回退）

    // gsap 的 `power1.inOut` 就是 easeInOutQuad：
    // f(t) = t<0.5 ? 2t² : 1-(-2t+2)²/2
    const easeInOutQuad = (t: number): number =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const tick = (nowMs: number): void => {
      if (this.destroyed) return;
      const elapsedMs = nowMs - startMs;
      const cycleT = (elapsedMs % cycleMs) / cycleMs; // 0~1，一个 yoyo 往返
      // yoyo：前半段 0~0.5 正向（0→1），后半段 0.5~1 反向（1→0）
      const dirT = cycleT < 0.5 ? cycleT * 2 : 1 - (cycleT - 0.5) * 2;
      const eased = easeInOutQuad(dirT);

      // 线性插值当前 height / heading
      const store = this.params as LightCone['params'];
      store.height = initialHeight + (targetHeight - initialHeight) * eased;
      store.heading = initialHeading + (targetHeading - initialHeading) * eased;
      this.applyModelMatrix();

      this.rafId = window.requestAnimationFrame(tick);
    };

    const startMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    this.rafId = window.requestAnimationFrame(tick);
  }

  /**
   * 暂停动画（保留当前位置/角度，可随时再调用 animate() 从当前"时刻"重新开始完整周期）。
   */
  public pause(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 停止动画并从场景中移除模型，释放资源。
   * 与 pause() 不同：destroy 之后实例不可再复用，model 引用会被置为 null。
   */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pause();
    const model = this.model;
    this.model = null;
    if (model && this.viewer?.scene?.primitives?.contains(model)) {
      this.viewer.scene.primitives.remove(model);
    }
  }
}
