import { Application, extensions, ResizePlugin } from 'pixi.js';

extensions.add(ResizePlugin);

let app: Application | null = null;

export async function getPixiApp(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<Application> {
  if (app) return app;

  app = new Application();

  await app.init({
    canvas,
    width,
    height,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
    powerPreference: 'high-performance',
    backgroundAlpha: 0,
    preference: 'webgl',
  });

  return app;
}

export function destroyPixiApp() {
  app?.destroy(false, { children: true, texture: true });
  app = null;
}
