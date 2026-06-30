//修改地图颜色
import * as Cesium from 'cesium';

/**
 * modifyMap 参数配置
 */
export interface ModifyMapOptions {
  /** 是否进行颜色翻转 (R=1-R, G=1-G, B=1-B) */
  invertColor?: boolean;
  /** RGB 通道过滤色值，范围 [0-255]，例如 [0, 50, 100] 会将纯白色 (255,255,255) 映射为 (0,50,100) */
  filterRGB?: [number, number, number];
  /** 要处理的影像图层索引，默认 0（最底层影像） */
  layerIndex?: number;
}

/**
 * 扩展 Cesium.ImageryLayer，在运行时附加 invertColor / filterRGB 自定义字段
 * （因为 TypeScript 编译期类型上不存在这两个字段，需显式声明）
 */
interface ImageryLayerExtended extends Cesium.ImageryLayer {
  invertColor?: boolean;
  filterRGB?: [number, number, number];
}

/**
 * 动态修改 Cesium 地球底图的片段着色器，实现颜色反转 + RGB 通道过滤。
 *
 * 说明：
 *  本逻辑沿用了旧版 Cesium 通过改写
 *    viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources
 *  注入 GLSL 代码的做法。Cesium 1.142 中该私有 API 仍然存在，
 *  但属于非公开接口，未来升级 Cesium 时可能需要调整。
 *
 * @param viewer   Cesium.Viewer 实例
 * @param options  可选配置项
 *
 * @example
 * // 颜色反转 + 冷色调过滤（保留旧版默认行为）
 * modifyMap(viewer);
 *
 * // 仅过滤颜色，不翻转
 * modifyMap(viewer, { invertColor: false, filterRGB: [20, 80, 160] });
 */
export default function modifyMap(
  viewer: Cesium.Viewer,
  options: ModifyMapOptions = {}
): void {
  const {
    invertColor = true,
    filterRGB = [0, 50, 100],
    layerIndex = 0,
  } = options;

  // 1. 安全获取影像图层
  const imageryLayers = viewer.imageryLayers;
  if (imageryLayers.length <= layerIndex) {
    console.warn(
      `[modifyMap] 不存在索引为 ${layerIndex} 的影像图层，跳过着色器修改。`
    );
    return;
  }
  const baseLayer = imageryLayers.get(layerIndex) as ImageryLayerExtended;

  // 2. 在图层对象上记录配置（与旧版代码行为保持一致）
  baseLayer.invertColor = invertColor;
  baseLayer.filterRGB = filterRGB;

  // 3. 定位地球表面片段着色器源码集合（私有 API，使用 any 以规避 TS 检查）
  const globe = viewer.scene.globe as unknown as {
    _surfaceShaderSet?: {
      baseFragmentShaderSource?: { sources?: string[] };
    };
  };

  const sources =
    globe._surfaceShaderSet?.baseFragmentShaderSource?.sources;

  if (!sources || sources.length === 0) {
    console.warn(
      '[modifyMap] 未找到 globe._surfaceShaderSet.baseFragmentShaderSource.sources，' +
        '可能是 Cesium 版本不兼容。当前着色器注入方式基于私有 API。'
    );
    return;
  }

  // 4. 构造需要替换/追加的 GLSL 代码段
  //    锚点：cesium 自带的饱和度处理语句 + #endif
  const anchorS =
    'color = czm_saturation(color, textureSaturation);\n#endif\n';

  let targetT = anchorS;
  if (baseLayer.invertColor) {
    targetT += `
      color.r = 1.0 - color.r;
      color.g = 1.0 - color.g;
      color.b = 1.0 - color.b;
    `;
  }
  if (baseLayer.filterRGB && baseLayer.filterRGB.length === 3) {
    const [r, g, b] = baseLayer.filterRGB;
    targetT += `
      color.r = color.r * ${r}.0 / 255.0;
      color.g = color.g * ${g}.0 / 255.0;
      color.b = color.b * ${b}.0 / 255.0;
    `;
  }

  // 5. 循环替换所有着色器源
  let patchedCount = 0;
  for (let i = 0; i < sources.length; i++) {
    if (typeof sources[i] === 'string' && sources[i].includes(anchorS)) {
      // 如果这段代码已经被 patch 过，避免重复注入
      if (sources[i].includes('[modifyMap-patched]')) {
        continue;
      }
      sources[i] = sources[i].replace(
        anchorS,
        // 加上标记注释，防止重复 patch
        `// [modifyMap-patched] start\n${targetT}// [modifyMap-patched] end\n`
      );
      patchedCount++;
    }
  }

  if (patchedCount === 0) {
    console.warn(
      '[modifyMap] 未在片段着色器中找到锚点 ' +
        '"color = czm_saturation(...);\\n#endif\\n"，注入失败。' +
        '可能是当前 Cesium 版本已改变着色器结构，建议改用 PostProcessStage 自定义着色器。'
    );
  } else {
    // 触发地球着色器重新编译（确保修改生效）
    globe._surfaceShaderSet = globe._surfaceShaderSet; // eslint-disable-line no-self-assign
  }
}
