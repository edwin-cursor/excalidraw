import { useCallback, useRef } from "react";

import { colorToHsvForWheel, hsvToHex } from "@excalidraw/common";

import { t } from "../../i18n";

import "./ColorWheelPicker.scss";

type ColorWheelPickerProps = {
  color: string | null;
  onChange: (hex: string) => void;
};

/**
 * Hue ring geometry matches ColorWheelPicker.scss: outer radius = half of box,
 * inset equals 2.375/7 of width so inner radius = outer * (1 - 2*2.375/7).
 */
const hueFromClientPoint = (
  rect: DOMRect,
  clientX: number,
  clientY: number,
): number | null => {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const relX = clientX - cx;
  const relY = clientY - cy;
  const outerR = rect.width / 2;
  const innerR = outerR * (1 - (2 * 2.375) / 7);
  const dist = Math.hypot(relX, relY);
  const pad = outerR * 0.06;
  if (dist < innerR - pad || dist > outerR + pad) {
    return null;
  }
  const angle = (Math.atan2(relX, -relY) * 180) / Math.PI;
  return ((angle % 360) + 360) % 360;
};

export const ColorWheelPicker = ({
  color,
  onChange,
}: ColorWheelPickerProps) => {
  const wheelRef = useRef<HTMLDivElement>(null);

  const { h, s, v } = colorToHsvForWheel(color);

  const applyHue = useCallback(
    (hue: number) => {
      onChange(hsvToHex(hue, s, v));
    },
    [onChange, s, v],
  );

  const pickAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current;
      if (!el) {
        return;
      }
      const hue = hueFromClientPoint(
        el.getBoundingClientRect(),
        clientX,
        clientY,
      );
      if (hue != null) {
        applyHue(hue);
      }
    },
    [applyHue],
  );

  return (
    <div className="color-wheel-picker">
      <div className="color-wheel-picker__heading">
        {t("colorPicker.colorWheel")}
      </div>
      <div
        ref={wheelRef}
        className="color-wheel-picker__wheel"
        role="slider"
        aria-label={t("colorPicker.colorWheel")}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(h)}
        tabIndex={0}
        onKeyDown={(e) => {
          let delta = 0;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            delta = e.shiftKey ? 15 : 3;
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            delta = e.shiftKey ? -15 : -3;
          } else {
            return;
          }
          e.preventDefault();
          applyHue(h + delta);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) {
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          pickAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
            return;
          }
          pickAt(e.clientX, e.clientY);
        }}
      >
        <div
          className="color-wheel-picker__pointer"
          style={{
            transform: `rotate(${h}deg) translateY(var(--color-wheel-hue-offset))`,
          }}
        />
      </div>
    </div>
  );
};
