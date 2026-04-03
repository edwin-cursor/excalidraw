import { useCallback, useLayoutEffect, useRef } from "react";

import { colorToHex, isTransparent, rgbToHex } from "@excalidraw/common";

import { t } from "../../i18n";

const rgbToHsv = (
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: max === 0 ? 0 : d / max, v: max };
};

const hsvToRgb = (
  h: number,
  s: number,
  v: number,
): [number, number, number] => {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
};

const parseOpaqueRgb = (
  color: string | null,
): { r: number; g: number; b: number } => {
  if (!color || isTransparent(color)) {
    return { r: 30, g: 30, b: 30 };
  }
  const hex = colorToHex(color);
  if (!hex) {
    return { r: 30, g: 30, b: 30 };
  }
  const clean = hex.replace(/^#/, "");
  const six = clean.length >= 6 ? clean.slice(0, 6) : clean;
  if (six.length !== 6) {
    return { r: 30, g: 30, b: 30 };
  }
  return {
    r: parseInt(six.slice(0, 2), 16),
    g: parseInt(six.slice(2, 4), 16),
    b: parseInt(six.slice(4, 6), 16),
  };
};

interface ColorWheelPickerProps {
  color: string | null;
  onChange: (color: string) => void;
  size?: number;
}

export const ColorWheelPicker = ({
  color,
  onChange,
  size = 220,
}: ColorWheelPickerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const logical = size;
    canvas.width = Math.floor(logical * dpr);
    canvas.height = Math.floor(logical * dpr);
    canvas.style.width = `${logical}px`;
    canvas.style.height = `${logical}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.scale(dpr, dpr);

    const cx = logical / 2;
    const cy = logical / 2;
    const outerR = logical / 2 - 2;
    const innerR = outerR * 0.52;

    const { data, width, height } = ctx.createImageData(logical, logical);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        const dist = Math.hypot(dx, dy);
        const i = (y * width + x) * 4;
        if (dist < innerR - 0.5 || dist > outerR + 0.5) {
          data[i + 3] = 0;
          continue;
        }
        let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
        hue = (hue + 360) % 360;
        const [r, g, b] = hsvToRgb(hue, 1, 1);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(new ImageData(data, width, height), 0, 0);

    // Center preview (current stroke)
    const { r: pr, g: pg, b: pb } = parseOpaqueRgb(color);
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 3, 0, Math.PI * 2);
    ctx.fillStyle = rgbToHex(pr, pg, pb);
    ctx.fill();
    ctx.strokeStyle = "var(--default-border-color, #ccc)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [color, size]);

  useLayoutEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const pickFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const logical = size;
      const cx = logical / 2;
      const cy = logical / 2;
      const outerR = logical / 2 - 2;
      const innerR = outerR * 0.52;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < innerR || dist > outerR) {
        return;
      }
      let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
      hue = (hue + 360) % 360;
      const [r, g, b] = hsvToRgb(hue, 1, 1);
      onChange(rgbToHex(r, g, b));
    },
    [onChange, size],
  );

  const baseRgb = parseOpaqueRgb(color);
  const { h: hue } = rgbToHsv(baseRgb.r, baseRgb.g, baseRgb.b);

  const outerR = size / 2 - 2;
  const innerR = outerR * 0.52;
  const midR = (innerR + outerR) / 2;
  const hueRad = (hue * Math.PI) / 180;
  const thumbX = size / 2 + Math.cos(hueRad) * midR;
  const thumbY = size / 2 + Math.sin(hueRad) * midR;
  const thumbSize = 14;

  return (
    <div className="color-wheel-picker">
      <div
        className="color-wheel-picker__surface"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          className="color-wheel-picker__canvas focus-visible-none"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hue)}
          aria-label={t("colorPicker.colorWheel")}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            draggingRef.current = true;
            pickFromEvent(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) {
              return;
            }
            pickFromEvent(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            draggingRef.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        />
        <div
          className="color-wheel-picker__thumb"
          style={{
            width: thumbSize,
            height: thumbSize,
            left: thumbX - thumbSize / 2,
            top: thumbY - thumbSize / 2,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
};
