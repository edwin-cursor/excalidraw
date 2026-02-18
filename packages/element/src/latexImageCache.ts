/**
 * Global cache for pre-rendered LaTeX images.
 * Populated by @excalidraw/excalidraw's latex.ts, consumed by renderElement.ts.
 */

interface LatexCacheEntry {
  image: HTMLImageElement;
  width: number;
  height: number;
}

const cache = new Map<string, LatexCacheEntry>();
const renderCallbacks = new Set<() => void>();

export const latexImageCache = {
  getCacheKey: (latex: string, fontSize: number, color: string): string =>
    `${latex}::${fontSize}::${color}`,

  get: (key: string): LatexCacheEntry | undefined => cache.get(key),

  set: (key: string, entry: LatexCacheEntry): void => {
    cache.set(key, entry);
    for (const cb of renderCallbacks) {
      cb();
    }
  },

  has: (key: string): boolean => cache.has(key),

  clear: (): void => cache.clear(),

  onRenderComplete: (callback: () => void): (() => void) => {
    renderCallbacks.add(callback);
    return () => renderCallbacks.delete(callback);
  },
};

type LatexMeasureFn = (
  text: string,
  fontSize: number,
) => { width: number; height: number };

let latexMeasureFn: LatexMeasureFn | null = null;

export const setLatexMeasurer = (fn: LatexMeasureFn): void => {
  latexMeasureFn = fn;
};

export const measureLatexText = (
  text: string,
  fontSize: number,
): { width: number; height: number } | null => {
  if (latexMeasureFn) {
    return latexMeasureFn(text, fontSize);
  }
  return null;
};
