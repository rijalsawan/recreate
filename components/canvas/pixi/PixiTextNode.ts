import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { CanvasText } from '@/types/canvas';
import type { HandleId } from './SelectionHandles';
import { SelectionHandles } from './SelectionHandles';

export class PixiTextNode {
  readonly container: Container;
  private text: Text;
  // Persistent TextStyle instance — mutated in-place so PixiJS only recomputes
  // what actually changed instead of regenerating the full texture on every sync.
  private style: TextStyle;
  // Invisible Graphics that covers the full text frame to provide 'move' cursor and
  // hit-testable area without restricting handle detection via container.hitArea.
  // Added as the FIRST child (lowest z-order) so handles placed above it take priority.
  private frameHitGraphic: Graphics;
  private selectionHandles: SelectionHandles | null = null;
  private cachedBounds: { width: number; height: number } | null = null;

  constructor(
    public readonly id: string,
    public data: CanvasText,
    private onHandlePointerDown: (id: HandleId, e: PointerEvent) => void,
    private onHandleHoverChange?: (hovering: boolean, cursor?: string) => void,
  ) {
    this.container = new Container();
    this.container.label = `text-${id}`;
    this.container.eventMode = 'static';
    // No cursor/hitArea on the container — child elements manage their own cursors.
    // Setting hitArea on the container prevents PixiJS from recurse-testing children
    // that extend outside the rect (corner handles), causing cursor to vanish.

    this.frameHitGraphic = new Graphics();
    this.frameHitGraphic.label = `text-frame-hit-${id}`;
    this.frameHitGraphic.eventMode = 'static';
    this.frameHitGraphic.cursor = 'move';
    this.container.addChild(this.frameHitGraphic); // index 0 — lowest z, tested last

    this.style = new TextStyle(this._buildStyleProps(data));
    this.text = new Text({ text: data.content, style: this.style });
    this.text.eventMode = 'none'; // transparent to pointer events; frameHitGraphic handles it
    this.container.addChild(this.text);
    this.applyTransform();
    this._updateHitArea();
  }

  private _buildStyleProps(d: CanvasText): Partial<TextStyle> {
    const normalizedColor = d.color.startsWith('#') ? d.color : `#${d.color}`;
    return {
      fontFamily: d.fontFamily || 'Arial',
      fontSize: d.fontSize,
      fontWeight: String(d.fontWeight) as TextStyle['fontWeight'],
      fill: normalizedColor,
      align: d.align,
      lineHeight: d.fontSize * d.lineHeight,
      letterSpacing: d.letterSpacing,
      wordWrap: true,
      wordWrapWidth: d.width,
      breakWords: true,
    };
  }

  applyTransform() {
    const { x, y, opacity } = this.data;
    this.container.position.set(x, y);
    this.container.alpha = opacity / 100;
  }

  private _updateHitArea() {
    const w = this.data.width;
    // Prefer explicit height, then rendered text height, then font-size estimate.
    const h = this.data.height ?? Math.max(this.text.height, this.data.fontSize * 1.5, 20);
    this.frameHitGraphic.clear();
    this.frameHitGraphic
      .rect(0, 0, Math.max(w, 1), Math.max(h, 1))
      .fill({ color: 0, alpha: 0 });
  }

  setSelected(selected: boolean, zoom: number) {
    if (selected && !this.selectionHandles) {
      const handles = new SelectionHandles(this.onHandlePointerDown, this.onHandleHoverChange);
      this.selectionHandles = handles;
      this.container.addChild(handles.container);
      this._updateHandleBounds(zoom);
    } else if (!selected && this.selectionHandles) {
      this.selectionHandles.destroy();
      this.selectionHandles = null;
    }
  }

  private _updateHandleBounds(zoom: number) {
    const bounds = this._getCachedBounds();
    const w = this.data.width;
    const h = this.data.height ?? Math.max(bounds.height, this.text.height, this.data.fontSize * 1.5, 20);
    this.selectionHandles?.update(w, h, zoom);
  }

  private _getCachedBounds(): { width: number; height: number } {
    if (!this.cachedBounds) {
      const b = this.text.getLocalBounds();
      this.cachedBounds = { width: b.width, height: b.height };
    }
    return this.cachedBounds;
  }

  updateHandles(zoom: number) {
    this._updateHitArea();
    this._updateHandleBounds(zoom);
  }

  // Hide the PixiJS text while a textarea overlay is active to prevent double rendering.
  setEditing(editing: boolean) {
    this.text.visible = !editing;
  }

  // Returns current text height for text resize calculations
  getTextHeight(): number {
    return this.data.height ?? this.text.height;
  }

  sync(newData: CanvasText, zoom: number) {
    const oldData = this.data;
    const contentChanged = newData.content !== oldData.content;
    const styleChanged =
      newData.fontFamily !== oldData.fontFamily ||
      newData.fontSize !== oldData.fontSize ||
      newData.fontWeight !== oldData.fontWeight ||
      newData.color !== oldData.color ||
      newData.align !== oldData.align ||
      newData.lineHeight !== oldData.lineHeight ||
      newData.letterSpacing !== oldData.letterSpacing ||
      newData.width !== oldData.width;
    const sizeChanged = newData.width !== oldData.width || newData.height !== oldData.height;

    this.data = newData;
    this.applyTransform();

    if (contentChanged) this.text.text = newData.content;

    // Update only the style properties that actually changed — mutating the
    // existing TextStyle instance avoids a full texture regeneration cycle.
    if (styleChanged) {
      const normalizedColor = newData.color.startsWith('#') ? newData.color : `#${newData.color}`;
      if (newData.fontFamily !== oldData.fontFamily) this.style.fontFamily = newData.fontFamily || 'Arial';
      if (newData.fontSize !== oldData.fontSize) this.style.fontSize = newData.fontSize;
      if (newData.fontWeight !== oldData.fontWeight) this.style.fontWeight = String(newData.fontWeight) as TextStyle['fontWeight'];
      if (newData.color !== oldData.color) this.style.fill = normalizedColor;
      if (newData.align !== oldData.align) this.style.align = newData.align;
      // lineHeight is derived from fontSize — update whenever either changes
      if (newData.lineHeight !== oldData.lineHeight || newData.fontSize !== oldData.fontSize) {
        this.style.lineHeight = newData.fontSize * newData.lineHeight;
      }
      if (newData.letterSpacing !== oldData.letterSpacing) this.style.letterSpacing = newData.letterSpacing;
      if (newData.width !== oldData.width) this.style.wordWrapWidth = newData.width;
    }

    if (contentChanged || styleChanged || sizeChanged) {
      this.cachedBounds = null;
      this._updateHitArea();
    }
    if (this.selectionHandles) this._updateHandleBounds(zoom);
  }

  destroy() {
    this.selectionHandles?.destroy();
    this.container.destroy({ children: true });
  }
}
