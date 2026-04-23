import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { CanvasText } from '@/types/canvas';
import type { HandleId } from './SelectionHandles';
import { SelectionHandles } from './SelectionHandles';

export class PixiTextNode {
  readonly container: Container;
  private text: Text;
  private selectionHandles: SelectionHandles | null = null;

  constructor(
    public readonly id: string,
    public data: CanvasText,
    private onHandlePointerDown: (id: HandleId, e: PointerEvent) => void,
  ) {
    this.container = new Container();
    this.container.label = `text-${id}`;
    this.container.eventMode = 'static';
    this.container.cursor = 'move';

    this.text = new Text({ text: data.content, style: this._buildStyle(data) });
    this.container.addChild(this.text);
    this.applyTransform();
  }

  private _buildStyle(d: CanvasText): Partial<TextStyle> {
    return {
      fontFamily: d.fontFamily || 'Arial',
      fontSize: d.fontSize,
      fontWeight: String(d.fontWeight) as TextStyle['fontWeight'],
      fill: `#${d.color}`,
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

  setSelected(selected: boolean, zoom: number) {
    if (selected && !this.selectionHandles) {
      const handles = new SelectionHandles(this.onHandlePointerDown);
      this.selectionHandles = handles;
      this.container.addChild(handles.container);
      this._updateHandleBounds(zoom);
    } else if (!selected && this.selectionHandles) {
      this.selectionHandles.destroy();
      this.selectionHandles = null;
    }
  }

  private _updateHandleBounds(zoom: number) {
    const bounds = this.text.getLocalBounds();
    const w = this.data.width;
    const h = this.data.height ?? bounds.height;
    this.selectionHandles?.update(w, h, zoom);
  }

  updateHandles(zoom: number) {
    this._updateHandleBounds(zoom);
  }

  // Returns current text height for text resize calculations
  getTextHeight(): number {
    return this.data.height ?? this.text.height;
  }

  sync(newData: CanvasText, zoom: number) {
    const contentChanged = newData.content !== this.data.content;
    const styleChanged =
      newData.fontFamily !== this.data.fontFamily ||
      newData.fontSize !== this.data.fontSize ||
      newData.fontWeight !== this.data.fontWeight ||
      newData.color !== this.data.color ||
      newData.align !== this.data.align ||
      newData.lineHeight !== this.data.lineHeight ||
      newData.letterSpacing !== this.data.letterSpacing ||
      newData.width !== this.data.width;

    this.data = newData;
    this.applyTransform();

    if (contentChanged) this.text.text = newData.content;
    if (styleChanged) this.text.style = this._buildStyle(newData) as TextStyle;
    if (this.selectionHandles) this._updateHandleBounds(zoom);
  }

  destroy() {
    this.selectionHandles?.destroy();
    this.container.destroy({ children: true });
  }
}
