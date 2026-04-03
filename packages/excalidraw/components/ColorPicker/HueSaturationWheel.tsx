import { useCallback, useEffect, useRef, useState } from "react";

import { isTransparent, normalizeInputColor } from "@excalidraw/common";

import tinycolor from "tinycolor2";

import { t } from "../../i18n";

import "./HueSaturationWheel.scss";

const WHEEL_SIZE = 200;
const THUMB_SIZE = 14;

function parseToHsv(color: string | null): { h: number; s: number; v: number } {
  if (!color || isTransparent(color)) {
    return { h: 0, s: 0, v: 1 };
  }
  const normalized = normalizeInputColor(color);
  if (!normalized || isTransparent(normalized)) {
    return { h: 0, s: 0, v: 1 };
  }
  const tc = tinycolor(normalized);
  if (!tc.isValid()) {
    return { h: 0, s: 0, v: 1 };
  }
  const { h, s, v } = tc.toHsv();
  return {
    h: Number.isFinite(h) ? h : 0,
    s,
    v,
  };
}

/** CSS conic gradient has red at 12 o'clock; map to tinycolor hue (0° = red at 3 o'clock). */
function wheelAngleToHue(rad: number): number {
  const deg = (rad * 180) / Math.PI;
  return (deg + 90 + 360) % 360;
}

function hueToWheelAngleRad(hue: number): number {
  return ((hue - 90) * Math.PI) / 180;
}

export const HueSaturationWheel = ({
  color,
  onChange,
}: {
  color: string | null;
  onChange: (color: string) => void;
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [hsv, setHsv] = useState(() => parseToHsv(color));
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  useEffect(() => {
    setHsv(parseToHsv(color));
  }, [color]);

  const radius = WHEEL_SIZE / 2;
  const innerRadius = Math.max(0, radius - THUMB_SIZE / 2);

  const emitColor = useCallback(
    (next: { h: number; s: number; v: number }) => {
      const hex = tinycolor({ h: next.h, s: next.s, v: next.v }).toHexString();
      onChange(hex);
    },
    [onChange],
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > innerRadius && dist > 0) {
        dx = (dx / dist) * innerRadius;
        dy = (dy / dist) * innerRadius;
      }
      const angle = Math.atan2(dy, dx);
      const s = innerRadius > 0 ? Math.min(1, dist / innerRadius) : 0;
      const h = wheelAngleToHue(angle);
      const next = { h, s, v: hsvRef.current.v };
      setHsv(next);
      emitColor(next);
    },
    [emitColor, innerRadius],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0 && e.type === "pointermove") {
      return;
    }
    if (!wheelRef.current?.hasPointerCapture(e.pointerId)) {
      return;
    }
    e.preventDefault();
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (wheelRef.current?.hasPointerCapture(e.pointerId)) {
      wheelRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const angleRad = hueToWheelAngleRad(hsv.h);
  const thumbDist = hsv.s * innerRadius;
  const thumbX = radius + Math.cos(angleRad) * thumbDist;
  const thumbY = radius + Math.sin(angleRad) * thumbDist;

  const brightnessMaxHex = tinycolor({
    h: hsv.h,
    s: hsv.s,
    v: 1,
  }).toHexString();

  return (
    <div className="hue-sat-wheel">
      <div
        ref={wheelRef}
        className="hue-sat-wheel__disk"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={t("colorPicker.colorWheel")}
        aria-valuetext={`H ${Math.round(hsv.h)}° S ${Math.round(
          hsv.s * 100,
        )}% V ${Math.round(hsv.v * 100)}%`}
        tabIndex={0}
        onKeyDown={(e) => {
          const stepHue = 3;
          const stepSat = 0.03;
          const next = { ...hsv };
          switch (e.key) {
            case "ArrowLeft":
              next.h = (next.h - stepHue + 360) % 360;
              break;
            case "ArrowRight":
              next.h = (next.h + stepHue) % 360;
              break;
            case "ArrowUp":
              next.s = Math.min(1, next.s + stepSat);
              break;
            case "ArrowDown":
              next.s = Math.max(0, next.s - stepSat);
              break;
            default:
              return;
          }
          e.preventDefault();
          e.stopPropagation();
          setHsv(next);
          emitColor(next);
        }}
      >
        <div
          className="hue-sat-wheel__thumb"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            left: `${thumbX}px`,
            top: `${thumbY}px`,
            marginLeft: -THUMB_SIZE / 2,
            marginTop: -THUMB_SIZE / 2,
            borderColor:
              hsv.v > 0.55 ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.85)",
          }}
        />
      </div>
      <div className="hue-sat-wheel__brightness-row">
        <input
          type="range"
          className="hue-sat-wheel__brightness"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          aria-label={t("colorPicker.brightness")}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            const next = { ...hsvRef.current, v };
            setHsv(next);
            emitColor(next);
          }}
          style={{
            background: `linear-gradient(to right, #000, ${brightnessMaxHex})`,
          }}
        />
      </div>
    </div>
  );
};
