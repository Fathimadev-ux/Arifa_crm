"use client";

import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_SMOOTH, GROW_DURATION } from "@/config/motion";

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({ value, format = String }: { value: number; format?: (value: number) => string }) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useMotionValueEvent(motionValue, "change", setDisplayValue);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: GROW_DURATION + 0.2, ease: EASE_SMOOTH });
    return () => controls.stop();
  }, [motionValue, value]);

  // Whole counts stay whole while counting up; money keeps its decimals.
  return <span className="tabular-nums">{format(Number.isInteger(value) ? Math.round(displayValue) : displayValue)}</span>;
}
