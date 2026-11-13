"use client";

import { motion } from "motion/react";
import { EASE_SMOOTH, GROW_DURATION, STAGGER_STEP } from "@/config/motion";
import { enterDelay } from "@/components/ui";

interface BarListProps {
  title: string;
  /** label → number; drawn in the given order. */
  entries: [label: string, value: number][];
  format?: (value: number) => string;
  isDark?: boolean;
  index?: number;
}

/** A titled card of horizontal bars (deals by country, pipeline by stage…), value at each bar's tip. */
export function BarList({ title, entries, format = (value) => value.toLocaleString(), isDark = false, index = 0 }: BarListProps) {
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <section className={`animate-enter lift p-6 ${isDark ? "panel-dark" : "panel"}`} style={enterDelay(index)}>
      <h2 className="mb-5 text-lg font-medium tracking-tight">{title}</h2>
      {entries.length === 0 && <p className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>No data for this period</p>}
      <ul className="group/bars space-y-3">
        {entries.map(([label, value], row) => (
          <li key={label} className="group grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3">
            <span className={`truncate text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>{label}</span>
            <div className="flex min-w-0 items-center gap-2">
              {value > 0 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: GROW_DURATION, delay: 0.15 + row * STAGGER_STEP, ease: EASE_SMOOTH }}
                  className={`h-2.5 origin-left rounded-full transition-opacity duration-500 group-hover/bars:opacity-35 group-hover:opacity-100! ${isDark ? "bg-white" : "bg-black"}`}
                  style={{ width: `${(value / max) * 70}%` }}
                />
              )}
              <span className="text-xs font-medium whitespace-nowrap tabular-nums">{format(value)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
