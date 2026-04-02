import { useCallback, useRef } from "react";

import { clamp } from "@excalidraw/math";

import { colorToHsvForWheel, hsvToHex } from "@excalidraw/common";

import { t } from "../../i18n";

import "./ColorWheelPicker.scss";

type ColorWheelPickerProps = {
  color: string | null;
  onChange: (hex: string) => void;
};

const polarFromClientPoint = (
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { hue: number; saturation: number } | null => {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const relX = clientX - cx;
  const relY = clientY - cy;
  //! Half width minus ~1px border fudge
  const maxR = rect.width / 2 - 1;
  const dist = Math.hypot(relX, relY);
  const pad = maxR * 0.02;
  if (dist > maxR + pad) {
    return null;
  }
  const saturation = clamp(dist / maxR, 0, 1);
  const angle = (Math.atan2(relX, -relY) * 180) / Math.PI;
  const hue = ((angle % 360) + 360) % 360;
  return { hue, saturation };
};

export const ColorWheelPicker = ({
  color,
  onChange,
}: ColorWheelPickerProps) => {
  const wheelRef = useRef<HTMLDivElement>(null);

  const { h, s, v } = colorToHsvForWheel(color);

  const applyHsv = useCallback(
    (hue: number, saturation: number) => {
      onChange(hsvToHex(hue, saturation, v));
    },
    [onChange, v],
  );

  const pickAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current;
      if (!el) {
        return;
      }
      const polar = polarFromClientPoint(
        el.getBoundingClientRect(),
        clientX,
        clientY,
      );
      if (polar != null) {
        applyHsv(polar.hue, polar.saturation);
      }
    },
    [applyHsv],
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
          applyHsv(h + delta, s);
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
            transform: `rotate(${h}deg) translateY(calc(-1 * ${s} * var(--color-wheel-thumb-travel)))`,
          }}
        />
      </div>
    </div>
  );
};
