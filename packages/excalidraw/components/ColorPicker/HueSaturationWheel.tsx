import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { colorToHsv, hsvToHex, hsvToRgb } from "@excalidraw/common";

import { t } from "../../i18n";
import { useAtom } from "../../editor-jotai";

import { activeColorPickerSectionAtom } from "./colorPickerUtils";

/** CSS pixels; rendered crisp via devicePixelRatio. */
const WHEEL_CSS_SIZE = 196;

type HueSaturationWheelProps = {
  color: string | null;
  onChange: (color: string) => void;
};

const pickFromEvent = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  valueChannel: number,
): string | null => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxR = Math.min(cx, cy) - 1;
  const dx = x - cx;
  const dy = y - cy;
  let dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    dist = maxR;
  }
  const sat = maxR > 0 ? dist / maxR : 0;
  let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (hue < 0) {
    hue += 360;
  }
  return hsvToHex(hue, sat, valueChannel);
};

export const HueSaturationWheel = ({
  color,
  onChange,
}: HueSaturationWheelProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valueRef = useRef(1);
  const draggingRef = useRef(false);
  const [, setActiveSection] = useAtom(activeColorPickerSectionAtom);

  useEffect(() => {
    const hsv = color ? colorToHsv(color) : null;
    valueRef.current = hsv?.v ?? 1;
  }, [color]);

  const hsv = color ? colorToHsv(color) : null;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio ?? 1;
    const size = Math.round(WHEEL_CSS_SIZE * dpr);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const cx = (size - 1) / 2;
    const cy = (size - 1) / 2;
    const maxR = Math.min(cx, cy) - dpr;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const i = (row * size + col) * 4;
        const dx = col - cx;
        const dy = row - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          data[i + 3] = 0;
          continue;
        }
        const sat = maxR > 0 ? dist / maxR : 0;
        let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (hue < 0) {
          hue += 360;
        }
        const { r, g, b } = hsvToRgb(hue, sat, 1);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const next = pickFromEvent(
        canvas,
        clientX,
        clientY,
        valueRef.current,
      );
      if (next) {
        onChange(next);
      }
    },
    [onChange],
  );

  useEffect(() => {
    const stopDrag = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, []);

  const hue = hsv?.h ?? 0;
  const sat = hsv?.s ?? 0;
  const maxR = WHEEL_CSS_SIZE / 2 - 2;
  const angleRad = (hue * Math.PI) / 180;
  const r = sat * maxR;
  const markerX = WHEEL_CSS_SIZE / 2 + r * Math.cos(angleRad);
  const markerY = WHEEL_CSS_SIZE / 2 + r * Math.sin(angleRad);

  return (
    <div className="color-picker__wheel-wrap">
      <canvas
        ref={canvasRef}
        className="color-picker__wheel-canvas"
        width={WHEEL_CSS_SIZE}
        height={WHEEL_CSS_SIZE}
        aria-label={t("colorPicker.colorWheel")}
        role="img"
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          draggingRef.current = true;
          setActiveSection("colorWheel");
          applyPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          const el = e.target as HTMLCanvasElement;
          if (el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) {
            return;
          }
          e.preventDefault();
          applyPointer(e.clientX, e.clientY);
        }}
      />
      <div
        className="color-picker__wheel-marker"
        style={{ left: markerX, top: markerY }}
        aria-hidden
      />
    </div>
  );
};
