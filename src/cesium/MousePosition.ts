//鼠标位置显示
import * as Cesium from 'cesium';

export default class MousePosition {
  // 显式声明类成员类型（TS 强制要求）
  private viewer: Cesium.Viewer;
  private divDom: HTMLDivElement;
  private handler: Cesium.ScreenSpaceEventHandler;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    // 1. 创建坐标显示 DOM
    this.divDom = document.createElement('div');
    this.divDom.style.cssText = `
      position: fixed;
      bottom: 0;
      right: 0;
      width: 240px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 14px;
      line-height: 40px;
      text-align: center;
      z-index: 100;
      pointer-events: none; /* 防止遮挡地图鼠标交互 */
    `;
    document.body.appendChild(this.divDom);

    // 2. 初始化鼠标事件处理器
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // 3. 绑定鼠标移动事件
    this.handler.setInputAction(
      (movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        this.updateCoordinate(movement.endPosition);
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
  }

  /**
   * 私有方法：更新经纬度显示
   * @param windowPos 鼠标窗口像素坐标
   */
  private updateCoordinate(windowPos: Cesium.Cartesian2): void {
    // 新版 Cesium 推荐拾取方式：支持地形高程，比 pickEllipsoid 更准确
    const pickRay = this.viewer.camera.getPickRay(windowPos);
    if (!pickRay) {
      this.divDom.innerText = '坐标无效';
      return;
    }

    const cartesian = this.viewer.scene.globe.pick(pickRay, this.viewer.scene);

    // 兼容原版：纯椭球面拾取（高度恒为0），不需要地形可换回
    // const cartesian = this.viewer.camera.pickEllipsoid(windowPos, Cesium.Ellipsoid.WGS84);

    if (!cartesian) {
      this.divDom.innerText = '暂无坐标';
      return;
    }

    // 笛卡尔坐标 → 经纬度（弧度转角度）
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
    const height = cartographic.height.toFixed(2);

    this.divDom.innerText = `经度: ${longitude}°  纬度: ${latitude}°  高度: ${height}m`;
  }

  /**
   * 销毁实例：移除事件监听 + DOM，防止内存泄漏
   */
  destroy(): void {
    if (this.handler && !this.handler.isDestroyed()) {
      this.handler.destroy();
    }
    if (this.divDom?.parentNode) {
      this.divDom.parentNode.removeChild(this.divDom);
    }
  }
}