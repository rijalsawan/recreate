import type { PixiImageNode } from '@/components/canvas/pixi/PixiImageNode';
import type { PixiTextNode } from '@/components/canvas/pixi/PixiTextNode';
import type { PixiStrokeNode } from '@/components/canvas/pixi/PixiStrokeNode';

const EVICT_DELAY_MS = 30_000;

// Buffer in SCREEN-SPACE pixels. An image must be this far off the viewport
// edge before it gets culled. Large value prevents premature culling during
// fast panning regardless of zoom level.
const CULL_SCREEN_BUFFER = 600;

export interface CullContext {
  panX: number;
  panY: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

// Viewport bounds in world (board-local) coordinates with generous buffer.
function worldBounds(ctx: CullContext) {
  // Convert screen-space buffer to world space so it scales correctly at any zoom.
  const pad = CULL_SCREEN_BUFFER / ctx.zoom;
  return {
    left:   (-ctx.panX / ctx.zoom) - pad,
    top:    (-ctx.panY / ctx.zoom) - pad,
    right:  ((-ctx.panX + ctx.canvasWidth)  / ctx.zoom) + pad,
    bottom: ((-ctx.panY + ctx.canvasHeight) / ctx.zoom) + pad,
  };
}

export function createCuller(
  imageNodes: Map<string, PixiImageNode>,
  textNodes:  Map<string, PixiTextNode>,
  strokeNodes: Map<string, PixiStrokeNode>,
) {
  const evictTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function onImageHidden(id: string, node: PixiImageNode) {
    if (evictTimers.has(id)) return;
    const timer = setTimeout(() => {
      evictTimers.delete(id);
      node.evictTexture();
    }, EVICT_DELAY_MS);
    evictTimers.set(id, timer);
  }

  function onImageVisible(id: string, node: PixiImageNode, zoom: number) {
    const timer = evictTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      evictTimers.delete(id);
    }
    if (!node.hasTexture()) {
      node.scheduleTextureLoad(node.data.url, zoom);
    }
  }

  function cull(ctx: CullContext) {
    const vp = worldBounds(ctx);

    for (const [id, node] of imageNodes) {
      const { x, y, width, height } = node.data;
      const visible =
        x + width  > vp.left  &&
        y + height > vp.top   &&
        x          < vp.right &&
        y          < vp.bottom;

      const wasVisible = node.container.renderable;
      node.container.renderable = visible;
      node.container.eventMode = visible ? 'static' : 'none';

      if (!visible && wasVisible)  onImageHidden(id, node);
      if (visible && (!wasVisible || !node.hasTexture())) onImageVisible(id, node, ctx.zoom);
    }

    for (const node of textNodes.values()) {
      const { x, y } = node.data;
      const approxH = node.data.height ?? node.data.fontSize * 3;
      const visible =
        x + node.data.width > vp.left  &&
        y + approxH         > vp.top   &&
        x                   < vp.right &&
        y                   < vp.bottom;
      node.container.renderable = visible;
      node.container.eventMode = visible ? 'static' : 'none';
    }

    for (const node of strokeNodes.values()) {
      const bb = node.getBounds();
      if (!bb) continue;
      const visible =
        bb.maxX > vp.left  &&
        bb.maxY > vp.top   &&
        bb.minX < vp.right &&
        bb.minY < vp.bottom;
      node.container.renderable = visible;
      node.container.eventMode = visible ? 'static' : 'none';
    }
  }

  function dispose(): void {
    for (const timer of evictTimers.values()) clearTimeout(timer);
    evictTimers.clear();
  }

  return { cull, dispose };
}
