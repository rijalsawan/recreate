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
    resizeTo: canvas.parentElement ?? undefined,
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
  // Do NOT pass { children: true } here.
  // children:true recursively calls sprite.destroy() which calls baseTexture.destroy()
  // while textures are still registered in the PixiJS Assets managed-texture set.
  // That triggers the "destroyed instead of unloaded" warning AND poisons the Assets
  // cache with destroyed texture objects, causing reload blank-canvas bugs.
  // Instead, skip child destruction — imageNodesRef.clear() drops all JS refs so GC
  // collects the display tree, and Assets.unload() (called from clearTextureCache)
  // properly destroys the textures through the correct path.
  app?.destroy(false, { children: false });
  app = null;
}
