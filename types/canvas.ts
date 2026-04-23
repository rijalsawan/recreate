// Shared canvas types. Structural duplicates of the interfaces defined inline
// inside app/project/[id]/page.tsx — TypeScript structural typing means values
// from page.tsx satisfy these types without requiring page.tsx to import them.

export interface CanvasAdjustments {
  hue: number;        // 0–360, neutral = 180  (maps to hue-rotate(hue-180 deg))
  saturation: number; // 0–200, neutral = 100  (maps to saturate(sat/100))
  brightness: number; // 0–200, neutral = 100  (maps to brightness(br/100))
  contrast: number;   // 0–200, neutral = 100  (maps to contrast(con/100))
  opacity: number;    // 0–100
}

export interface CanvasImage {
  id: string;
  url: string;
  width: number;
  height: number;
  x: number;
  y: number;
  prompt: string;
  model: string;
  style: string;
  ratio: string;
  isFrame?: boolean;
  adjustments?: CanvasAdjustments;
}

export interface CanvasText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;           // hex without '#', e.g. "ffffff"
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  width: number;
  height?: number;
  opacity: number;
  historyImageId?: string | null;
}

export type DrawMode = 'brush' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'ellipse';
export type DrawShapeKind = Exclude<DrawMode, 'eraser'>;

export interface BrushStroke {
  id: string;
  kind?: DrawShapeKind;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  fill?: boolean;
  fillColor?: string;
  historyImageId?: string | null;
}

export interface HistoryEntry {
  label: string;
  timestamp: number;
  snapshot: CanvasImage[];
  textSnapshot: CanvasText[];
  brushSnapshot: BrushStroke[];
  selectedId: string | null;
  selectedStrokeId: string | null;
  historyImageId?: string | null;
}

export type ActiveTool =
  | 'select'
  | 'hand'
  | 'shapes'
  | 'frame'
  | 'text'
  | 'upload'
  | 'brush'
  | null;

export interface SnapLine {
  axis: 'x' | 'y';
  pos: number;
}

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}
