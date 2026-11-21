"use client";

import type { ReactNode } from "react";

/**
 * The CRM's studio backdrop behind every admin screen (login included): soft lit white spheres and capsules,
 * fixed in place. The frosted panels blur whatever sits behind them, which is what makes the glass visible.
 */
const SHAPES = ["arifa-sphere arifa-shape--1", "arifa-sphere arifa-shape--2", "arifa-sphere arifa-shape--3", "arifa-capsule arifa-shape--4", "arifa-capsule arifa-shape--5"];

export function Backdrop({ children }: { children?: ReactNode }) {
  return (
    <>
      <div className="arifa-backdrop" aria-hidden>
        {SHAPES.map((shape) => (
          <span key={shape} className={shape} />
        ))}
      </div>
      {children}
    </>
  );
}
