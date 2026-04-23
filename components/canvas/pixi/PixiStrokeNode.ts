import { Container, Graphics } from 'pixi.js';
import type { BrushStroke } from '@/types/canvas';

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function hexToRgba(hex: string, alpha: number): number {
  // Returns an ARGB-packed number that PixiJS accepts as a color with separate alpha
  return hexToNumber(hex);
}

export class PixiStrokeNode {
  readonly container: Container;
  private graphics: Graphics;
  private selectionOutline: Graphics | null = null;

  constructor(
    public readonly id: string,
    public data: BrushStroke,
  ) {
    this.container = new Container();
    this.container.label = `stroke-${id}`;
    this.container.eventMode = 'static';
    this.container.cursor = 'move';

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.redraw();
  }

  redraw() {
    const s = this.data;
    // offsetX/offsetY translate the whole stroke in world space
    this.container.position.set(s.offsetX, s.offsetY);
    this.container.alpha = s.opacity / 100;
    this._draw();
  }

  private _draw() {
    const s = this.data;
    const g = this.graphics;
    g.clear();

    const pts = s.points;
    if (pts.length === 0) return;
    const color = s.color;
    const colorNum = hexToNumber(color);

    const kind = s.kind ?? 'brush';

    if (kind === 'brush') {
      if (pts.length < 2) return;
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        g.lineTo(pts[i].x, pts[i].y);
      }
      g.stroke({ color: colorNum, width: s.size, cap: 'round', join: 'round' });
      return;
    }

    const sx = pts[0].x;
    const sy = pts[0].y;
    const ex = pts[pts.length - 1]?.x ?? sx;
    const ey = pts[pts.length - 1]?.y ?? sy;

    if (kind === 'line') {
      g.moveTo(sx, sy).lineTo(ex, ey);
      g.stroke({ color: colorNum, width: s.size, cap: 'round' });
      return;
    }

    if (kind === 'arrow') {
      const angle = Math.atan2(ey - sy, ex - sx);
      const head = Math.max(10, s.size * 2.6);
      const a1 = angle - Math.PI / 7;
      const a2 = angle + Math.PI / 7;
      g.moveTo(sx, sy).lineTo(ex, ey);
      g.stroke({ color: colorNum, width: s.size, cap: 'round' });
      g.moveTo(ex - head * Math.cos(a1), ey - head * Math.sin(a1))
        .lineTo(ex, ey)
        .lineTo(ex - head * Math.cos(a2), ey - head * Math.sin(a2));
      g.stroke({ color: colorNum, width: s.size, cap: 'round', join: 'round' });
      return;
    }

    if (kind === 'rectangle') {
      const rx = Math.min(sx, ex);
      const ry = Math.min(sy, ey);
      const rw = Math.max(1, Math.abs(ex - sx));
      const rh = Math.max(1, Math.abs(ey - sy));
      g.rect(rx, ry, rw, rh);
      if (s.fill) {
        g.fill({ color: hexToNumber(s.fillColor || color), alpha: 0.32 });
      }
      g.stroke({ color: colorNum, width: s.size });
      return;
    }

    if (kind === 'ellipse') {
      const cx = (sx + ex) / 2;
      const cy = (sy + ey) / 2;
      const rx = Math.max(1, Math.abs(ex - sx) / 2);
      const ry = Math.max(1, Math.abs(ey - sy) / 2);
      g.ellipse(cx, cy, rx, ry);
      if (s.fill) {
        g.fill({ color: hexToNumber(s.fillColor || color), alpha: 0.32 });
      }
      g.stroke({ color: colorNum, width: s.size });
    }
  }

  setSelected(selected: boolean, w: number, h: number, zoom: number) {
    if (selected && !this.selectionOutline) {
      const outline = new Graphics();
      outline.label = 'stroke-selection';
      this.container.addChild(outline);
      this.selectionOutline = outline;
      this._drawSelectionOutline(w, h, zoom);
    } else if (!selected && this.selectionOutline) {
      this.selectionOutline.destroy();
      this.selectionOutline = null;
    }
  }

  private _drawSelectionOutline(w: number, h: number, zoom: number) {
    if (!this.selectionOutline) return;
    const { points: pts } = this.data;
    if (pts.length === 0) return;

    // Compute bounding box of the stroke
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = this.data.size / 2 + 4 / zoom;
    this.selectionOutline.clear();
    this.selectionOutline
      .rect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2)
      .stroke({ color: 0x7c3aed, width: 1.5 / zoom, alpha: 1 });
  }

  // Bounding box for hit testing
  getBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const pts = this.data.points;
    if (pts.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = this.data.size / 2;
    return {
      minX: minX + this.data.offsetX - pad,
      minY: minY + this.data.offsetY - pad,
      maxX: maxX + this.data.offsetX + pad,
      maxY: maxY + this.data.offsetY + pad,
    };
  }

  sync(newData: BrushStroke, zoom: number) {
    this.data = newData;
    this.redraw();
    if (this.selectionOutline) {
      this._drawSelectionOutline(0, 0, zoom);
    }
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
