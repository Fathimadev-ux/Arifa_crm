"use client";

import { type KillSwitchLevel, setKillSwitch, useKillSwitch } from "@/lib/api/admin";
import { LoadingState } from "@/components/ui";

/** D35: each level stops more, from nothing to holding every outgoing message. */
const LEVELS: { id: KillSwitchLevel; label: string; stops: string }[] = [
  { id: "off", label: "Off", stops: "Everything runs normally" },
  { id: "marketing", label: "Marketing", stops: "Stops marketing messages" },
  { id: "calls", label: "Calls", stops: "Stops AI calls" },
  { id: "text_only", label: "Text only", stops: "Stops calls and voice; text still goes out" },
  { id: "hold", label: "Hold", stops: "Holds every outgoing message" },
];

/** The kill switch: admin or MD (MFA) sets the level; every change is logged. */
export function KillSwitchPanel({ canSet }: { canSet: boolean }) {
  const { data: state } = useKillSwitch();
  if (!state) return <LoadingState />;
  return (
    <ul className="animate-enter grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {LEVELS.map((level) => {
        const isCurrent = state.level === level.id;
        return (
          <li key={level.id}>
            <button
              disabled={!canSet || isCurrent}
              onClick={() => void setKillSwitch(level.id)}
              aria-pressed={isCurrent}
              className={`lift h-full w-full rounded-[1.75rem] p-5 text-left transition-colors disabled:cursor-default ${isCurrent ? "panel-dark" : "panel hover:bg-white"}`}
            >
              <p className="text-lg font-medium tracking-tight">{level.label}</p>
              <p className={`mt-1 text-sm ${isCurrent ? "text-neutral-300" : "text-neutral-500"}`}>{level.stops}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
