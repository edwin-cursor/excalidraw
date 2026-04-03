import clsx from "clsx";
import React, { useCallback, useLayoutEffect, useRef } from "react";

import { colorToHsv, hsvToHex, isTransparent } from "@excalidraw/common";

import { clamp } from "@excalidraw/math";

import { useAtom } from "../../editor-jotai";
import { t } from "../../i18n";

import { activeColorPickerSectionAtom } from "./colorPickerUtils";

const WHEEL_PADDING = 6;
const WHEEL_OUTER_R = 52;
const WHEEL_INNER_R = 34;
const SV_SIZE = 72;
const GAP = 10;
const CANVAS_W = WHEEL_PADDING * 2 + WHEEL_OUTER_R * 2 + GAP + SV_SIZE;
const CANVAS_H = Math.max(
  WHEEL_PADDING * 2 + WHEEL_OUTER_R * 2,
  SV_SIZE + WHEEL_PADDING * 2,
);

const WHEEL_CX = WHEEL_PADDING + WHEEL_OUTER_R;
const WHEEL_CY = CANVAS_H / 2;

const SV_LEFT = WHEEL_PADDING + WHEEL_OUTER_R * 2 + GAP;
const SV_TOP = (CANVAS_H - SV_SIZE) / 2;

function hsvToRgbByte(
  h: number,
  s: number,
  v: number,
): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
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
}

const drawWheelAndSquare = (
  ctx: CanvasRenderingContext2D,
  hue: number,
  sat: number,
  val: number,
) => {
  const imageData = ctx.createImageData(CANVAS_W, CANVAS_H);
  const data = imageData.data;

  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      const i = (y * CANVAS_W + x) * 4;
      if (
        x >= SV_LEFT &&
        x < SV_LEFT + SV_SIZE &&
        y >= SV_TOP &&
        y < SV_TOP + SV_SIZE
      ) {
        const s = (x - SV_LEFT) / (SV_SIZE - 1);
        const vv = 1 - (y - SV_TOP) / (SV_SIZE - 1);
        const [r, g, b] = hsvToRgbByte(hue, clamp(s, 0, 1), clamp(vv, 0, 1));
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
        continue;
      }

      const dx = x - WHEEL_CX;
      const dy = y - WHEEL_CY;
      const dist = Math.hypot(dx, dy);
      if (dist <= WHEEL_OUTER_R && dist >= WHEEL_INNER_R) {
        let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (angleDeg < 0) {
          angleDeg += 360;
        }
        if (angleDeg >= 360) {
          angleDeg -= 360;
        }
        const [r, g, b] = hsvToRgbByte(angleDeg, 1, 1);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const hRad = ((hue - 90) * Math.PI) / 180;
  const mr = (WHEEL_INNER_R + WHEEL_OUTER_R) / 2;
  const mx = WHEEL_CX + Math.cos(hRad) * mr;
  const my = WHEEL_CY + Math.sin(hRad) * mr;
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.strokeStyle = val > 0.65 ? "#111" : "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();

  const sx = SV_LEFT + sat * (SV_SIZE - 1);
  const sy = SV_TOP + (1 - val) * (SV_SIZE - 1);
  ctx.beginPath();
  ctx.arc(sx, sy, 4, 0, Math.PI * 2);
  ctx.strokeStyle = val > 0.55 ? "#111" : "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
};

const defaultHsv = { h: 0, s: 1, v: 1, a: 1 };

function pickHsvFromColor(color: string | null): {
  h: number;
  s: number;
  v: number;
  a: number;
} {
  if (!color || isTransparent(color)) {
    return { ...defaultHsv };
  }
  const hsv = colorToHsv(color);
  return hsv ?? { ...defaultHsv };
}

type DragMode = "hue" | "sv" | null;

export const ColorWheel = ({
  color,
  onChange,
}: {
  color: string | null;
  onChange: (hex: string) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hsvRef = useRef(pickHsvFromColor(color));
  const dragRef = useRef<DragMode>(null);
  const [, setActiveSection] = useAtom(activeColorPickerSectionAtom);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const { h, s, v } = hsvRef.current;
    drawWheelAndSquare(ctx, h, s, v);
  }, []);

  const emitFromHsv = useCallback(
    (h: number, s: number, v: number, a: number) => {
      onChange(hsvToHex(h, s, v, a));
      redraw();
    },
    [onChange, redraw],
  );

  useLayoutEffect(() => {
    hsvRef.current = pickHsvFromColor(color);
    redraw();
  }, [color, redraw]);

  const canvasCoords = useCallback((ev: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (ev.clientX - rect.left) * scaleX,
      y: (ev.clientY - rect.top) * scaleY,
    };
  }, []);

  const updateFromPoint = useCallback(
    (x: number, y: number, mode: DragMode) => {
      const { h, s, v, a } = hsvRef.current;
      if (mode === "hue") {
        const dx = x - WHEEL_CX;
        const dy = y - WHEEL_CY;
        let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (angleDeg < 0) {
          angleDeg += 360;
        }
        if (angleDeg >= 360) {
          angleDeg -= 360;
        }
        hsvRef.current = { h: angleDeg, s, v, a };
        emitFromHsv(angleDeg, s, v, a);
      } else if (mode === "sv") {
        const ns = clamp((x - SV_LEFT) / (SV_SIZE - 1), 0, 1);
        const nv = clamp(1 - (y - SV_TOP) / (SV_SIZE - 1), 0, 1);
        hsvRef.current = { h, s: ns, v: nv, a };
        emitFromHsv(h, ns, nv, a);
      }
    },
    [emitFromHsv],
  );

  const hitTest = (x: number, y: number): DragMode => {
    const dx = x - WHEEL_CX;
    const dy = y - WHEEL_CY;
    const dist = Math.hypot(dx, dy);
    if (dist <= WHEEL_OUTER_R && dist >= WHEEL_INNER_R) {
      return "hue";
    }
    if (
      x >= SV_LEFT &&
      x <= SV_LEFT + SV_SIZE &&
      y >= SV_TOP &&
      y <= SV_TOP + SV_SIZE
    ) {
      return "sv";
    }
    return null;
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    ev.preventDefault();
    const { x, y } = canvasCoords(ev);
    const mode = hitTest(x, y);
    if (!mode) {
      return;
    }
    dragRef.current = mode;
    setActiveSection("colorWheel");
    (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
    updateFromPoint(x, y, mode);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const mode = dragRef.current;
    if (!mode) {
      return;
    }
    const { x, y } = canvasCoords(ev);
    updateFromPoint(x, y, mode);
  };

  const onPointerUp = (ev: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (ev.target as HTMLCanvasElement).releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
      dragRef.current = null;
    }
  };

  return (
    <div className="color-picker-wheel-wrap">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t("colorPicker.colorWheel")}
        width={CANVAS_W}
        height={CANVAS_H}
        className={clsx("color-picker-wheel-canvas")}
        style={{
          touchAction: "none",
          maxWidth: "100%",
          height: "auto",
          display: "block",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
};
