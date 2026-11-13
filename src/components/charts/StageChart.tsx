"use client";

import { motion } from "motion/react";
import { EASE_SMOOTH, GROW_DURATION, STAGGER_STEP } from "@/config/motion";

export interface StageCount {
  label: string;
  count: number;
}

/** White bars on a black card: open deals per stage, in pipeline order, count at each bar tip. */
export function StageChart({ stages }: { stages: StageCount[] }) {
  const maxCount = Math.max(1, ...stages.map((stage) => stage.count));
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <figure>
      <figcaption className="mb-6">
        <span className="block text-lg font-medium tracking-tight">Open deals</span>
        <span className="mt-1 block text-4xl font-light tracking-tight tabular-nums">{total}</span>
      </figcaption>
      <ul className="group/bars space-y-3.5">
        {stages.map((stage, index) => (
          <li key={stage.label} tabIndex={0} aria-label={`${stage.label}: ${stage.count} deals`} className="group grid grid-cols-[96px_1fr] items-center gap-3 outline-none">
            <span className="truncate text-xs text-neutral-400">{stage.label}</span>
            <div className="flex items-center gap-2">
              {stage.count > 0 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: GROW_DURATION, delay: 0.2 + index * STAGGER_STEP, ease: EASE_SMOOTH }}
                  className="h-3 origin-left rounded-full bg-white transition-opacity duration-500 group-hover/bars:opacity-35 group-hover:opacity-100! group-focus-visible:opacity-100!"
                  style={{ width: `${(stage.count / maxCount) * 78}%` }}
                />
              )}
              <span className="text-xs font-medium tabular-nums">{stage.count > 0 ? stage.count : <span className="text-neutral-600">—</span>}</span>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
