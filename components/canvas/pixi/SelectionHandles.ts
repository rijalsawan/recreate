import { Container, Graphics } from 'pixi.js';

const PRIMARY = 0x7c3aed;
const BORDER_W = 2;
const HANDLE_VIS = 6;
const HANDLE_HIT = 16;
const HANDLE_BORDER_W = 1.25;
const MIN_ZOOM_FOR_HANDLES = 0.2;

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_DEFS: { id: HandleId; xf: number; yf: number; cursor: string }[] = [
  { id: 'nw', xf: 0,   yf: 0,   cursor: 'nw-resize' },
  { id: 'n',  xf: 0.5, yf: 0,   cursor: 'n-resize'  },
  { id: 'ne', xf: 1,   yf: 0,   cursor: 'ne-resize' },
  { id: 'e',  xf: 1,   yf: 0.5, cursor: 'e-resize'  },
  { id: 'se', xf: 1,   yf: 1,   cursor: 'se-resize' },
  { id: 's',  xf: 0.5, yf: 1,   cursor: 's-resize'  },
  { id: 'sw', xf: 0,   yf: 1,   cursor: 'sw-resize' },
  { id: 'w',  xf: 0,   yf: 0.5, cursor: 'w-resize'  },
];

export class SelectionHandles {
  readonly container: Container;
  private border: Graphics;
  private handles = new Map<HandleId, Graphics>();

  constructor(
    private readonly onHandlePointerDown: (id: HandleId, e: PointerEvent) => void,
  ) {
    this.container = new Container();
    this.container.label = 'selection-handles';
    this.container.eventMode = 'none';

    this.border = new Graphics();
    this.container.addChild(this.border);

    for (const def of HANDLE_DEFS) {
      const g = new Graphics();
      g.eventMode = 'static';
      g.cursor = def.cursor;
      g.label = `handle-${def.id}`;
      g.on('pointerdown', (ev) => {
        ev.stopPropagation();
        this.onHandlePointerDown(def.id, ev.nativeEvent as PointerEvent);
      });
      this.handles.set(def.id, g);
      this.container.addChild(g);
    }
  }

  // Call this whenever the owning node dimensions change or when selection first appears.
  // w and h are in world-space (before zoom), zoom is used to scale handles inversely.
  update(w: number, h: number, zoom: number) {
    // Border: 2px ring inside the bounding box
    this.border.clear();
    this.border
      .rect(0, 0, w, h)
      .stroke({ color: PRIMARY, width: BORDER_W / zoom, alpha: 1, alignment: 1 });

    // Handles: visible only above min zoom threshold
    const showHandles = zoom >= MIN_ZOOM_FOR_HANDLES;
    const visSize = HANDLE_VIS / zoom;
    const hitSize = HANDLE_HIT / zoom;

    for (const def of HANDLE_DEFS) {
      const g = this.handles.get(def.id)!;
      const hx = def.xf * w;
      const hy = def.yf * h;

      g.clear();
      g.visible = showHandles;

      if (showHandles) {
        // Invisible hit area
        g
          .rect(-hitSize / 2, -hitSize / 2, hitSize, hitSize)
          .fill({ color: 0xffffff, alpha: 0 });

        // Visible square
        g
          .rect(-visSize / 2, -visSize / 2, visSize, visSize)
          .fill({ color: 0xffffff })
          .stroke({ color: PRIMARY, width: HANDLE_BORDER_W / zoom });
      }

      g.position.set(hx, hy);
    }
  }

  // Stroke-mode: just an outline, no drag handles
  updateStrokeSelection(w: number, h: number, zoom: number) {
    this.border.clear();
    this.border
      .rect(0, 0, w, h)
      .stroke({ color: PRIMARY, width: 1.5 / zoom, alpha: 1, alignment: 1 });

    for (const g of this.handles.values()) {
      g.visible = false;
    }
  }

  destroy() {
    this.border.destroy();
    for (const g of this.handles.values()) g.destroy();
    this.container.destroy();
  }
}
