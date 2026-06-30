//初始化地图
import * as Cesium from 'cesium';

export default async function initViewer(){
  // 从环境变量读取 Cesium Ion Token，避免硬编码泄露
  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  } else {
    console.warn('[Cesium] 未配置 VITE_CESIUM_ION_TOKEN 环境变量，Ion 相关资源将无法加载。请参考 .env.example 在 .env.local 中配置。');
  }



  const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,// 动画控件
    timeline: false,// 时间线控件
    baseLayerPicker: false,// 图层选择控件
    geocoder: false,// 地名查找控件
    homeButton: false,// 主页控件
    sceneModePicker: false,// 场景模式控件
    navigationHelpButton: false,// 帮助按钮
    fullscreenButton: false,// 全屏控件
    infoBox: false,// 信息框控件
    selectionIndicator: false,// 选择指示器控件
    skyBox: false, // 禁用天空盒
    shouldAnimate: true,// 启动时钟驱动动画（流光、光锥、场景灯光等依赖）
  });


  // 隐藏logo
  (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';
  // 开启光照效果（太阳/方向光参与 PBR 着色）。
  // 注意：下方额外配了 DirectionalLight + 中午时间 + HDR Gamma 三重保险，
  // 即使 CustomShader 对某个 tile 不生效，fallback 到 PBR 的建筑也不会黑。
  viewer.scene.globe.enableLighting = true;

  // ========== 修复"建筑/模型发黑"的三重保险 ==========
  // 保险1：强制场景时间 = 北半球夏至 2024-06-21 UTC 04:00 → 广州 UTC+8 正好中午 12 点，
  //         太阳角度最高，PBR 接收到的太阳光最强。
  //         这一步保证若依赖默认 SunLight，建筑不会因"凌晨/夜晚"而整体变黑。
  const noonLocal = new Date(Date.UTC(2024, 5, 21, 4, 0, 0)); // Month 是 0-based
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(noonLocal);
  viewer.clock.shouldAnimate = true; // 保持流光、光锥动画帧前进

  // 保险2：自定义 DirectionalLight 替代默认 SunLight（强度 3.0，方向从场景上方斜射）。
  //         不管系统时间如何，始终保证高亮度白光打到模型上。强度 3.0 比默认强，
  //         但下方 HDR + gamma 会压回正常范围，避免过曝。
  viewer.scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(
      -0.3,   // X（东→西，负=从西边打过来一点）
      -0.5,   // Y（北→南，负=从北边打过来一点）
       1.0,   // Z（上，保证正上方亮）
    ),
    intensity: 3.0,
    color: Cesium.Color.WHITE,
  });

  // 保险3：开启 HDR 保留亮部动态范围，防止 PBR 计算把暗部直接裁剪到 0（视觉全黑）。
  // 注意：不再手动覆盖 scene.gamma，Cesium 在 HDR 开启时内部会自动用正确的 2.2 gamma
  // 输出到 sRGB 帧缓冲；手动覆盖容易导致整体偏暗（尤其对于原本就接近 0 的颜色值）。
  viewer.scene.highDynamicRange = true;
  // =====================================================

  // 设置背景为黑色
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  // 设置抗锯齿
  viewer.scene.postProcessStages.fxaa.enabled = true;

  // 广州塔
  var postion = Cesium.Cartesian3.fromDegrees(
    // 经度
    113.3484,
    // 纬度
    23.0971,
    // 高度
    1500
  );
  viewer.camera.flyTo({
    destination: postion,
    orientation: {
      heading: Cesium.Math.toRadians(-45),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0,
    },
    duration: 2,
  });

  return viewer;

}