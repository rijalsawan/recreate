import {
  Container,
  Graphics,
  Sprite,
  Texture,
  ColorMatrixFilter,
} from 'pixi.js';
import type { CanvasImage } from '@/types/canvas';
import type { HandleId } from './SelectionHandles';
import { SelectionHandles } from './SelectionHandles';
import { loadTexture, getLodUrl } from '@/lib/textureCache';

// Returns [x1,y1,x2,y2] for a segment along a rectangle perimeter (clockwise from top-left)
function perimeterSegment(
  w: number, h: number, t0: number, t1: number,
): [number, number, number, number] | null {
  const map = (t: number): [number, number] => {
    if (t <= w)           return [t, 0];
    if (t <= w + h)       return [w, t - w];
    if (t <= 2 * w + h)   return [w - (t - w - h), h];
    return [0, h - (t - 2 * w - h)];
  };
  const [x1, y1] = map(t0);
  const [x2, y2] = map(t1);
  if (Math.hypot(x2 - x1, y2 - y1) < 0.5) return null;
  return [x1, y1, x2, y2];
}

export class PixiImageNode {
  readonly container: Container;
  private sprite: Sprite;
  private frameGraphics: Graphics | null = null;
  private selectionHandles: SelectionHandles | null = null;
  private colorFilter: ColorMatrixFilter | null = null;
  private currentTextureUrl: string | null = null;
  private textureRequestVersion = 0;

  constructor(
    public readonly id: string,
    public data: CanvasImage,
    private onHandlePointerDown: (id: HandleId, e: PointerEvent) => void,
    private onHandleHoverChange?: (hovering: boolean, cursor?: string) => void,
  ) {
    this.container = new Container();
    this.container.label = `image-${id}`;
    this.container.eventMode = 'static';
    this.container.cursor = 'move';

    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.label = `sprite-${id}`;
    this.container.addChild(this.sprite);

    if (data.isFrame) {
      this.frameGraphics = new Graphics();
      this.frameGraphics.label = `frame-${id}`;
      this.container.addChild(this.frameGraphics);
      this.sprite.visible = false;
    }

    this.applyTransform();
    // Texture load is deferred to syncImages which supplies the correct current zoom.
  }

  // ── Transforms ────────────────────────────────────────────────────────────

  applyTransform() {
    const { x, y, width: w, height: h } = this.data;
    this.container.position.set(x, y);
    if (this.data.isFrame) {
      this._drawFrame(w, h);
    } else {
      this._sizeSprite(w, h);
      this._applyAdjustments();
    }
  }

  private _drawFrame(w: number, h: number) {
    const g = this.frameGraphics;
    if (!g) return;
    g.clear();
    g.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0.03 });
    const dash = 8, gap = 4;
    const perimeter = 2 * (w + h);
    let drawn = 0;
    let drawing = true;
    while (drawn < perimeter) {
      const segLen = drawing ? dash : gap;
      const end = Math.min(drawn + segLen, perimeter);
      if (drawing) {
        const pts = perimeterSegment(w, h, drawn, end);
        if (pts) g.moveTo(pts[0], pts[1]).lineTo(pts[2], pts[3]);
      }
      drawn = end;
      drawing = !drawing;
    }
    g.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
  }

  // Scale the sprite to fill the container exactly (object-fill semantics).
  // AI-generated images always match the container ratio, so this is visually
  // identical to object-cover in practice. Avoids PixiJS v8 stencil mask issues.
  private _sizeSprite(w: number, h: number) {
    const tex = this.sprite.texture;
    if (!tex || tex === Texture.EMPTY || tex.width === 0) {
      this.sprite.width = w;
      this.sprite.height = h;
      this.sprite.position.set(0, 0);
      return;
    }
    this.sprite.width = w;
    this.sprite.height = h;
    this.sprite.position.set(0, 0);
  }

  private _applyAdjustments() {
    const a = this.data.adjustments;

    if (!a) {
      this.sprite.filters = [];
      this.colorFilter = null;
      this.sprite.alpha = 1;
      return;
    }

    const isNeutral =
      a.hue === 180 && a.saturation === 100 &&
      a.brightness === 100 && a.contrast === 100;

    if (isNeutral) {
      this.sprite.filters = [];
      this.colorFilter = null;
    } else {
      if (!this.colorFilter) this.colorFilter = new ColorMatrixFilter();
      const f = this.colorFilter;
      f.reset();
      if (a.hue !== 180)        f.hue(a.hue - 180, true);
      if (a.saturation !== 100) f.saturate((a.saturation - 100) / 100, true);
      if (a.brightness !== 100) f.brightness(a.brightness / 100, true);
      if (a.contrast !== 100)   f.contrast(a.contrast / 200, true);
      this.sprite.filters = [f];
    }

    this.sprite.alpha = a.opacity / 100;
  }

  // ── Texture loading ────────────────────────────────────────────────────────

  scheduleTextureLoad(url: string, zoom: number) {
    if (!url) return;
    const lodUrl = getLodUrl(url, zoom);
    const requestVersion = ++this.textureRequestVersion;
    loadTexture(lodUrl)
      .then((tex) => {
        if (this.sprite.destroyed || tex === Texture.EMPTY) return;
        // Ignore stale loads from earlier URL/LOD requests.
        if (requestVersion !== this.textureRequestVersion) return;
        this.currentTextureUrl = lodUrl;
        this.sprite.texture = tex;
        this._sizeSprite(this.data.width, this.data.height);
      })
      .catch(() => {/* non-fatal */});
  }

  swapLodTexture(zoom: number) {
    this.scheduleTextureLoad(this.data.url, zoom);
  }

  hasTexture(): boolean {
    return (
      !this.sprite.destroyed &&
      this.sprite.texture !== Texture.EMPTY &&
      !this.sprite.texture.destroyed
    );
  }

  evictTexture() {
    const url = this.currentTextureUrl;
    this.currentTextureUrl = null;
    // Invalidate pending async load responses while hidden.
    this.textureRequestVersion++;
    if (url) {
      import('@/lib/textureCache').then(({ evictTexture }) => evictTexture(url));
    }
    if (!this.sprite.destroyed) this.sprite.texture = Texture.EMPTY;
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  setSelected(selected: boolean, zoom: number) {
    if (selected && !this.selectionHandles) {
      const handles = new SelectionHandles(this.onHandlePointerDown, this.onHandleHoverChange);
      this.selectionHandles = handles;
      this.container.addChild(handles.container);
      handles.update(this.data.width, this.data.height, zoom);
    } else if (!selected && this.selectionHandles) {
      this.selectionHandles.destroy();
      this.selectionHandles = null;
    }
  }

  updateHandles(zoom: number) {
    this.selectionHandles?.update(this.data.width, this.data.height, zoom);
  }

  // ── Sync from updated data ─────────────────────────────────────────────────

  sync(newData: CanvasImage, zoom: number) {
    const urlChanged = newData.url !== this.data.url;
    const sizeChanged = newData.width !== this.data.width || newData.height !== this.data.height;
    const a = this.data.adjustments;
    const na = newData.adjustments;
    const adjChanged =
      a?.hue !== na?.hue ||
      a?.saturation !== na?.saturation ||
      a?.brightness !== na?.brightness ||
      a?.contrast !== na?.contrast ||
      a?.opacity !== na?.opacity ||
      (a == null) !== (na == null);

    this.data = newData;
    this.applyTransform();

    if (urlChanged) this.scheduleTextureLoad(newData.url, zoom);
    if (sizeChanged && this.selectionHandles) {
      this.selectionHandles.update(newData.width, newData.height, zoom);
    }
    if (adjChanged) this._applyAdjustments();
  }

  destroy() {
    this.currentTextureUrl = null;
    this.textureRequestVersion++;
    this.selectionHandles?.destroy();
    this.colorFilter = null;
    this.frameGraphics = null;
    this.container.destroy({ children: true });
  }
}
