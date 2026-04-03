import React, { useEffect, useLayoutEffect, useRef } from "react";

import {
  COLOR_PALETTE,
  colorToHsv,
  hsvToOpaqueHex,
  isTransparent,
} from "@excalidraw/common";
import { clamp } from "@excalidraw/math";

import type { HsvColor } from "@excalidraw/common";

import { t } from "../../i18n";

import "./StrokeColorWheel.scss";

/** Red at 3 o'clock; center white; edge saturated at V=1 */
const WHEEL_SIZE_PX = 132;
const THUMB_RADIUS_PX = 6;

const DEFAULT_FALLBACK_HEX = COLOR_PALETTE.black;

const hueSatFromPointer = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { h: number; s: number } => {
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const R = Math.min(cx, cy) - 1;
  const x = clientX - rect.left - cx;
  const y = clientY - rect.top - cy;
  const dist = Math.hypot(x, y);
  const s = clamp(dist / R, 0, 1);
  const angle = Math.atan2(y, x);
  const h = ((angle * 180) / Math.PI + 360) % 360;
  return { h, s };
};

const thumbPosition = (h: number, s: number, width: number, height: number) => {
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(cx, cy) - 1;
  const rad = (h * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * s * R,
    y: cy + Math.sin(rad) * s * R,
  };
};

const drawHueSatDisk = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(cx, cy) - 1;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      const i = (py * width + px) * 4;
      if (dist > R) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
        continue;
      }
      const sat = dist / R;
      const angle = Math.atan2(dy, dx);
      const hue = ((angle * 180) / Math.PI + 360) % 360;
      const hex = hsvToOpaqueHex({ h: hue, s: sat, v: 1 });
      if (!hex) {
        data[i + 3] = 0;
        continue;
      }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

function useHueSatDiskCanvas(w: number, h: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    drawHueSatDisk(ctx, w, h);
  }, [w, h]);
  return ref;
}

const effectiveHexForHsv = (color: string | null): string => {
  if (!color || isTransparent(color)) {
    return DEFAULT_FALLBACK_HEX;
  }
  return color;
};

export const StrokeColorWheel = ({
  color,
  onChange,
}: {
  color: string | null;
  onChange: (color: string) => void;
}) => {
  const canvasRef = useHueSatDiskCanvas(WHEEL_SIZE_PX, WHEEL_SIZE_PX);
  const wheelWrapRef = useRef<HTMLDivElement>(null);
  const lastHueRef = useRef(0);

  const parsed = colorToHsv(effectiveHexForHsv(color));
  useEffect(() => {
    const p = colorToHsv(effectiveHexForHsv(color));
    if (p && Number.isFinite(p.h)) {
      lastHueRef.current = p.h;
    }
  }, [color]);

  const hsv: Required<HsvColor> = parsed
    ? {
        h: Number.isFinite(parsed.h) ? parsed.h : lastHueRef.current,
        s: parsed.s,
        v: parsed.v,
      }
    : { h: lastHueRef.current, s: 0, v: 0 };

  const brightHex =
    hsvToOpaqueHex({ h: hsv.h, s: hsv.s, v: 1 }) ?? DEFAULT_FALLBACK_HEX;
  const thumb = thumbPosition(hsv.h, hsv.s, WHEEL_SIZE_PX, WHEEL_SIZE_PX);

  const applyHsv = (next: HsvColor) => {
    const h = Number.isFinite(next.h) ? next.h : lastHueRef.current;
    lastHueRef.current = h;
    const hex = hsvToOpaqueHex({ h, s: next.s, v: next.v });
    if (hex) {
      onChange(hex);
    }
  };

  const onWheelPointer = (clientX: number, clientY: number) => {
    const el = wheelWrapRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const { h, s } = hueSatFromPointer(clientX, clientY, rect);
    lastHueRef.current = h;
    applyHsv({ h, s, v: hsv.v });
  };

  const onSliderPointer = (clientX: number, rect: DOMRect) => {
    const t = clamp((clientX - rect.left) / rect.width, 0, 1);
    applyHsv({ h: hsv.h, s: hsv.s, v: t });
  };

  return (
    <div className="stroke-color-wheel">
      <div className="stroke-color-wheel__heading">
        {t("colorPicker.colorWheel")}
      </div>
      <div
        ref={wheelWrapRef}
        className="stroke-color-wheel__disk-wrap"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onWheelPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
            return;
          }
          onWheelPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <canvas
          ref={canvasRef}
          className="stroke-color-wheel__disk"
          width={WHEEL_SIZE_PX}
          height={WHEEL_SIZE_PX}
          aria-hidden
        />
        <div
          className="stroke-color-wheel__thumb"
          style={{
            width: THUMB_RADIUS_PX * 2,
            height: THUMB_RADIUS_PX * 2,
            left: thumb.x - THUMB_RADIUS_PX,
            top: thumb.y - THUMB_RADIUS_PX,
            backgroundColor: brightHex,
          }}
        />
      </div>
      <div
        className="stroke-color-wheel__value"
        role="slider"
        aria-label={t("colorPicker.brightness")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          e.stopPropagation();
          const step = e.shiftKey ? 0.1 : 0.02;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            applyHsv({
              h: hsv.h,
              s: hsv.s,
              v: clamp(hsv.v - step, 0, 1),
            });
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            applyHsv({
              h: hsv.h,
              s: hsv.s,
              v: clamp(hsv.v + step, 0, 1),
            });
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onSliderPointer(e.clientX, e.currentTarget.getBoundingClientRect());
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
            return;
          }
          onSliderPointer(e.clientX, e.currentTarget.getBoundingClientRect());
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <div
          className="stroke-color-wheel__value-gradient"
          style={{
            background: `linear-gradient(to right, #000000, ${brightHex})`,
          }}
        />
        <div
          className="stroke-color-wheel__value-thumb"
          style={{ left: `calc(${hsv.v * 100}% - 6px)` }}
        />
      </div>
    </div>
  );
};
