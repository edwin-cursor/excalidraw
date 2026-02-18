import katex from "katex";
import katexCssRaw from "katex/dist/katex.min.css?raw";

import { FONT_FAMILY } from "@excalidraw/common";
import { latexImageCache, setLatexMeasurer } from "@excalidraw/element";

const strippedKatexCss = (() => {
  return katexCssRaw
    .replace(/@font-face\s*\{[^}]*\}/g, "")
    .replace(
      /\.katex\s*\{/,
      `.katex { font-family: "KaTeX_Main", "Times New Roman", "STIX Two Math", "Cambria Math", "Latin Modern Math", serif; `,
    );
})();

const pendingRenders = new Set<string>();

const createSvgDataUrl = (
  html: string,
  width: number,
  height: number,
  fontSize: number,
  color: string,
): string => {
  const escapedColor = color.replace(/"/g, "&quot;");
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${fontSize}px;color:${escapedColor};line-height:normal;">
      <style>${strippedKatexCss}</style>
      ${html}
    </div>
  </foreignObject>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
};

export const measureLatex = (
  latex: string,
  fontSize: number,
): { width: number; height: number } => {
  if (typeof document === "undefined") {
    return { width: fontSize * latex.length * 0.6, height: fontSize * 1.4 };
  }

  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: false,
    output: "htmlAndMathml",
  });

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.fontSize = `${fontSize}px`;
  container.style.whiteSpace = "nowrap";
  container.style.lineHeight = "normal";
  container.innerHTML = html;
  document.body.appendChild(container);

  const rect = container.getBoundingClientRect();
  const width = Math.ceil(rect.width) + 4;
  const height = Math.ceil(rect.height) + 4;

  document.body.removeChild(container);

  return {
    width: Math.max(width, 10),
    height: Math.max(height, fontSize),
  };
};

export const renderLatexToCache = (
  latex: string,
  fontSize: number,
  color: string,
  onComplete?: () => void,
): void => {
  const key = latexImageCache.getCacheKey(latex, fontSize, color);

  if (latexImageCache.has(key) || pendingRenders.has(key)) {
    return;
  }

  pendingRenders.add(key);

  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: "htmlAndMathml",
    });

    const { width, height } = measureLatex(latex, fontSize);
    const svgDataUrl = createSvgDataUrl(html, width, height, fontSize, color);

    const image = new Image();
    image.onload = () => {
      latexImageCache.set(key, { image, width, height });
      pendingRenders.delete(key);
      onComplete?.();
    };
    image.onerror = () => {
      pendingRenders.delete(key);
    };
    image.src = svgDataUrl;
  } catch {
    pendingRenders.delete(key);
  }
};

export const isLatexFontFamily = (fontFamily: number): boolean => {
  return fontFamily === FONT_FAMILY.Math;
};

export const clearLatexCache = (): void => {
  latexImageCache.clear();
  pendingRenders.clear();
};

export const renderLatexToSvgElement = (
  latex: string,
  fontSize: number,
  color: string,
  svgDoc: Document,
): { node: SVGForeignObjectElement; width: number; height: number } => {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: false,
    output: "htmlAndMathml",
  });

  const { width, height } = measureLatex(latex, fontSize);

  const foreignObject = svgDoc.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  foreignObject.setAttribute("width", `${width}`);
  foreignObject.setAttribute("height", `${height}`);

  const div = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "div");
  div.setAttribute(
    "style",
    `font-size:${fontSize}px;color:${color};line-height:normal;`,
  );

  const style = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "style");
  style.textContent = strippedKatexCss;
  div.appendChild(style);

  const katexContainer = svgDoc.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "span",
  );
  katexContainer.innerHTML = html;
  div.appendChild(katexContainer);

  foreignObject.appendChild(div);

  return { node: foreignObject, width, height };
};

setLatexMeasurer(measureLatex);
