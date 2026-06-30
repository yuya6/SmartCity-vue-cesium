import * as Cesium from 'cesium';

/**
 * modifyBuild 配置参数
 */
export interface ModifyBuildOptions {
  /**
   * 外部已有的 OSM Buildings 3D Tileset。
   *  - 若传入：**不会**重复创建建筑，直接对该 tileset 应用 style 与着色器。
   *    推荐与 App.vue 中通过 `createOsmBuildingsAsync` 创建好的实例配合使用，避免重复加载。
   *  - 若省略：内部会调用 `Cesium.createOsmBuildingsAsync()` 创建新建筑并添加到 scene。
   */
  tileset?: Cesium.Cesium3DTileset | null;

  /**
   * Cesium3DTileStyle 的 show 过滤表达式（字符串模板）。
   * 默认：`${feature['name']} !== '广州塔'`，即隐藏名为"广州塔"的那栋楼。
   * 若需要显示所有建筑，可传 `true`。
   */
  showExpression?: string | boolean;

  /**
   * 是否启用"高度渐变 + 动态光环"的着色器效果。
   * 默认 true。
   *  - 配合 `useCustomShader:true`（默认）时走官方公开的 `Cesium.CustomShader` 路径
   *    （Cesium 1.118+ Model 2.0 / ModelExperimental 管线完全兼容）。
   *  - 配合 `useCustomShader:false` 时走旧版私有字段 hack
   *    （`_model._rendererResources.sourceShaders[1]`，仅 Cesium 1.117- 有效）。
   */
  patchShader?: boolean;

  /**
   * 是否优先使用 `Cesium.CustomShader`（公开 API，推荐）。
   * 默认 **true**。
   *  - true：通过 `tileset.customShader` 一次性注入建筑渐变 + 光环效果，
   *    性能更高、无私有字段依赖，是当前 Cesium 1.142 的官方推荐写法。
   *  - false：使用旧版 `tileVisible` + 逐 model 改写 `sourceShaders[1]` 的私有 hack，
   *    仅用于兼容非常旧的 Cesium 版本（<=1.117）。
   */
  useCustomShader?: boolean;

  /**
   * 渐变 + 光环 的色彩参数。默认完全对齐旧版效果：
   *  strength = pos.z / gradientHeightScale, color(strength, 0.3*strength, strength, 1.0)
   *  ring 范围：z ∈ [0, ringHeightScale]。
   */
  gradientHeightScale?: number; // 默认 200
  ringHeightScale?: number;     // 默认 500
  ringCycleSeconds?: number;    // 默认 10（=600 帧 @ 60fps）
  ringEdge?: number;            // 默认 0.05（原 0.01 → 扩大 5 倍，保证缩放下 LOD tile 仍可见光环）

  /**
   * createOsmBuildingsAsync 的透传参数（当 tileset 未传入、需内部创建时生效）。
   */
  osmBuildingsOptions?: Parameters<typeof Cesium.createOsmBuildingsAsync>[0];
}

/**
 * 内部使用的最小 3DTile 结构类型（用于 TS 访问旧版私有字段时的类型断言）
 */
interface TileLike {
  content: {
    featuresLength?: number;
    getFeature?: (index: number) => { content?: { _model?: ModelLike } };
    batchTableJson?: unknown;
  };
}

/**
 * 内部使用的最小 Model 结构类型（Cesium 1.x 早期 Model 的私有字段）
 */
interface ModelLike {
  _rendererResources?: {
    sourceShaders?: (string | undefined)[];
  };
  _shouldRegenerateShaders?: boolean;
}

/**
 * 构造 Cesium.CustomShader，实现与旧版私有 hack 完全相同的
 * 「高度渐变颜色 + 沿高度方向往返移动的白色动态光环」视觉效果。
 *
 * 旧版对照（便于核对等价性）：
 *  vec4 position    = czm_inverseModelView * vec4(v_positionEC, 1.0);  // 模型空间坐标
 *  float strength   = position.z / 200.0;
 *  gl_FragColor     = vec4(strength, 0.3*strength, strength, 1.0);
 *  float time       = fract(czm_frameNumber / (60.0 * 10.0));   // 10 秒一个周期
 *  time             = abs(time - 0.5) * 2.0;                    // [0,1] 三角波，往返
 *  float diff       = abs(clamp(position.z / 500.0, 0.0, 1.0) - time);
 *  diff             = step(0.01, diff);                         // 距离 > 0.01 → 1，内部 → 0
 *  gl_FragColor.rgb += vec3(0.5) * (1.0 - diff);                // 光带处加亮 0.5
 */
function createBuildingsCustomShader(options: {
  gradientHeightScale: number;
  ringHeightScale: number;
  ringCycleSeconds: number;
  ringEdge: number;
}): Cesium.CustomShader {
  const {
    gradientHeightScale,
    ringHeightScale,
    ringCycleSeconds,
    ringEdge,
  } = options;

  const framesPerCycle = Math.max(1, Math.round(ringCycleSeconds * 60));

  // REPLACE_MATERIAL + UNLIT：完全替换原本的 PBR 输出，直接写颜色（与旧版 gl_FragColor 行为对齐）
  // 注意：此处故意保留"模型空间 positionMC.z"而不用世界坐标 ECEF：
  //   ① OSM Buildings 的 extrusion（挤出）几何体，positionMC.z 天然就是
  //     "相对 tile 底部的米高"，语义与旧版完全一致，0 → 建筑底部，max → 建筑顶。
  //   ② 不同 tile 可能 modelMatrix 原点高度不同（地面海拔不同），但单个 tile
  //     内 z 值尺度是一致的，渐变 + 环光用"相对 tile 底部"就够了，不依赖椭球近似。
  //   ③ 上一轮用 ECEF 长度 - WGS84 长半轴的"椭球近似"是错误的：
  //     广州（北纬 23°）的 ECEF 方向半径 ≈ 6368 km < 6378 km（长半轴），
  //     所以 length(posWC) - 6378137 全是负数 → hClamped=0 → 全栋楼输出纯黑。
  //     已回退，确保 shader 一定能输出非黑的渐变。
  return new Cesium.CustomShader({
    mode: Cesium.CustomShaderMode.REPLACE_MATERIAL,
    lightingModel: Cesium.LightingModel.UNLIT,
    fragmentShaderText: /* glsl */ `
      // 分带子环的周期高度（米），故意取质数：
      //   避免与常见楼高（100/200/500/600 m）成整数倍关系，
      //   这样 fract(z/BAND_HEIGHT) 对任何楼高都不会卡在 0 或 1 边界上，
      //   彻底解决广州塔（600 m）等超高层"环光刚好在边界上导致肉眼看不到"的问题。
      const float BAND_HEIGHT = 137.0;

      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
      {
          vec3 position = fsInput.attributes.positionMC;
          float z = position.z;

          // ====== 高度渐变颜色 ======
          float strength = clamp(z / ${gradientHeightScale.toFixed(1)}, 0.0, 3.0);
          strength = max(strength, 0.15);
          vec3  baseCol  = vec3(strength, 0.3 * strength, strength);

          // ====== 动态光带（双通道并行，保证任意高度每 10s 内至少能看到流光） ======
          float framesCycle = float(${framesPerCycle.toFixed(1)});
          float t = fract(float(czm_frameNumber) / framesCycle);
          float time = abs(t - 0.5) * 2.0;             // [0,1] 三角波（往返）

          // —— 通道 A：全局单环（在 0~ringHeightScale 全范围内上下扫一根大光带） ——
          float normZA = clamp(z / ${ringHeightScale.toFixed(1)}, 0.0, 1.0);
          float diffA  = abs(normZA - time);
          diffA = step(${ringEdge.toFixed(3)}, diffA);
          float ringA = 1.0 - diffA;

          // —— 通道 B：分带子环（每 137m 在楼体里循环一根光带，质数避免边界截断） ——
          float zBand = fract(z / BAND_HEIGHT);
          float diffB = abs(zBand - time);
          diffB = step(${ringEdge.toFixed(3)}, diffB);
          float ringB = 1.0 - diffB;

          // 两通道取 OR：A 或 B 只要一个在光带内就点亮白色
          float on = clamp(ringA + ringB, 0.0, 1.0);
          vec3  ring = vec3(0.5) * on;

          material.diffuse = baseCol + ring;
          material.alpha   = 1.0;
      }
    `,
  });
}

/**
 * modifyBuild —— 旧版 modifyBuild.js 的 TypeScript 升级版。
 *
 * 实现的 3 件事（与旧版 100% 对齐）：
 *  1) 加载（或接收）OSM Buildings 3D Tileset
 *  2) 应用 Cesium3DTileStyle.show 过滤（默认隐藏"广州塔"）
 *  3) 应用「高度渐变 + 动态光环」着色效果：
 *     - 默认（推荐）走 Cesium.CustomShader 公开 API 一次性注入
 *     - 可选 useCustomShader:false 退化为旧版 tileVisible + 私有字段 hack
 *
 * @param viewer   Cesium.Viewer 实例
 * @param options  配置
 * @returns        Promise，resolve 为最终使用的 tileset 实例（便于外部继续使用）。
 */
export default async function modifyBuild(
  viewer: Cesium.Viewer,
  options: ModifyBuildOptions = {}
): Promise<Cesium.Cesium3DTileset | null> {
  const {
    tileset: externalTileset,
    showExpression = "${feature['name']} !== '广州塔'",
    patchShader = true,
    useCustomShader = true,
    gradientHeightScale = 200,
    ringHeightScale = 500,
    ringCycleSeconds = 10,
    ringEdge = 0.05,
    osmBuildingsOptions,
  } = options;

  // ================= 1. 拿到 tileset（复用外部 or 内部创建） =================
  let tileset: Cesium.Cesium3DTileset | null = externalTileset ?? null;

  if (!tileset) {
    tileset = await Cesium.createOsmBuildingsAsync(osmBuildingsOptions ?? {});
    viewer.scene.primitives.add(tileset);
  }

  // ================= 2. 应用 Cesium3DTileStyle.show 过滤 =================
  try {
    tileset.style = new Cesium.Cesium3DTileStyle({
      show: showExpression,
    });
  } catch (e) {
    console.warn('[modifyBuild] 设置 Cesium3DTileStyle.show 失败：', e);
  }

  // ================= 3. 应用「高度渐变 + 动态光环」着色效果 =================
  if (patchShader) {
    if (useCustomShader && typeof Cesium.CustomShader === 'function') {
      // ===== 路径 A（默认，推荐）：Cesium.CustomShader 公开 API =====
      try {
        tileset.customShader = createBuildingsCustomShader({
          gradientHeightScale,
          ringHeightScale,
          ringCycleSeconds,
          ringEdge,
        });

        // ========== 保底设置（当 CustomShader 对某类 tile/feature 不生效时 fallback） ==========
        // 关闭背面裁剪：OSM Buildings 的挤压几何体有时法线方向不一致，
        // 关闭可避免背阴面直接被裁掉显示为黑色。
        tileset.backFaceCulling = false;
        // 强制 PBR 光照颜色为纯白无偏色，强度用全局 DirectionalLight 控制。
        tileset.lightColor = new Cesium.Cartesian3(1, 1, 1);
        // 彻底关闭 IBL（天空/大气/环境贴图贡献），防止环境光缺失导致 PBR 输出接近 0。
        if (tileset.imageBasedLighting != null) {
          tileset.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(0, 0);
        }
      } catch (e) {
        console.warn(
          '[modifyBuild] 设置 Cesium.CustomShader 失败，回退到旧版私有 hack 路径：',
          e
        );
        applyLegacyShaderPatch(tileset);
      }
    } else {
      // ===== 路径 B（兼容旧版 Cesium）：tileVisible + 逐 model 改写 sourceShaders =====
      applyLegacyShaderPatch(tileset);
    }
  }

  return tileset;
}

/**
 * 旧版着色器 hack（Cesium <= 1.117）。
 * 在 `tileVisible` 事件里，遍历 tile 内每个 feature 的 `_model`，
 * 直接改写 `_rendererResources.sourceShaders[1]` 注入自定义片元着色器，
 * 并设置 `_shouldRegenerateShaders = true` 触发重编译。
 */
function applyLegacyShaderPatch(tileset: Cesium.Cesium3DTileset): void {
  const patchedModels = new WeakSet<object>(); // 同一个 model 只 patch 一次

  const onTileVisible = (tile: TileLike): void => {
    const content = tile.content;
    if (!content) return;
    const featuresLength = content.featuresLength ?? 0;
    if (featuresLength <= 0) return;
    if (typeof content.getFeature !== 'function') return;

    let anyPatched = 0;
    let anyMissed = 0;

    for (let i = 0; i < featuresLength; i++) {
      const feature = content.getFeature(i);
      const model: ModelLike | undefined = feature?.content?._model;
      if (!model) {
        anyMissed++;
        continue;
      }
      if (patchedModels.has(model as unknown as object)) continue;

      const sources = model._rendererResources?.sourceShaders;
      if (!sources || !Array.isArray(sources) || sources.length < 2) {
        anyMissed++;
        continue;
      }
      if (typeof sources[1] !== 'string') {
        anyMissed++;
        continue;
      }

      // 注入片元着色器（与旧版 GLSL 内容完全一致）
      sources[1] = `
varying vec3 v_positionEC;

void main()
{
    czm_materialInput materialInput;
    // 获取模型position信息
    vec4 position = czm_inverseModelView * vec4(v_positionEC, 1.0);
    //   根据高度来设置渐变颜色
    float  strength = position.z/200.0;
    gl_FragColor = vec4(strength,0.3*strength,strength, 1.0);

    //   动态光环
    //   czm_frameNumber获取当前帧数
    //   fract(x),返回x的小数部分
    float time  = fract(czm_frameNumber/(60.0*10.0));
  //   float time  = fract(czm_frameNumber/60.0)*6.28 ;
  //   实现往返的操作
     time = abs(time-0.5)*2.0;
  // time = sin(time);
  // clamp(x, min, max)，返回x在min和max之间的最小值
  float diff = abs(clamp(position.z/500.0, 0.0, 1.0) - time) ;
  // step(edge, x)，如果x大于等于edge，返回1，否则返回0
  diff = step(0.01, diff);
  gl_FragColor.rgb += vec3(0.5)*(1.0-diff);



}
          `;

      // 触发 Cesium 在下一帧重新编译该 model 的 shader 程序
      model._shouldRegenerateShaders = true;
      patchedModels.add(model as unknown as object);
      anyPatched++;
    }

    if (anyMissed > 0 && anyPatched === 0) {
      (onTileVisible as unknown as { _warned?: boolean })._warned ??= (() => {
        console.warn(
          '[modifyBuild:legacy] 未找到旧版可 hack 的 model._rendererResources.sourceShaders 结构。' +
            '当前 Cesium 版本（1.118+）使用 Model 2.0 管线，基于私有字段的着色器注入方式已不再生效。' +
            '请改为 useCustomShader:true（默认即为 true），走 Cesium.CustomShader 公开 API 路径。'
        );
        return true;
      })();
    }
  };

  const tileSetAny = tileset as unknown as {
    tileVisible?: {
      addEventListener: (cb: (tile: TileLike) => void) => void;
    };
  };
  if (tileSetAny.tileVisible?.addEventListener) {
    tileSetAny.tileVisible.addEventListener(onTileVisible);
  } else {
    console.warn(
      '[modifyBuild:legacy] tileset 未暴露 tileVisible 事件，旧版着色器注入已跳过。'
    );
  }
}
