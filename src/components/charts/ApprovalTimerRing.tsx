const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ring that fills as the time from `start` to `deadline` runs out. Fully black once overdue. */
export function ApprovalTimerRing({ start, deadline, now }: { start: string; deadline: string; now: number }) {
  const startMs = new Date(start).getTime();
  const deadlineMs = new Date(deadline).getTime();
  const usedShare = Math.min(1, Math.max(0, (now - startMs) / Math.max(1, deadlineMs - startMs)));
  const isOverdue = now >= deadlineMs;

  return (
    <svg viewBox="0 0 28 28" className="size-7 shrink-0 -rotate-90" role="img" aria-label={isOverdue ? "Overdue" : `${Math.round(usedShare * 100)}% of the time used`}>
      <circle cx="14" cy="14" r={RADIUS} fill="none" strokeWidth="3" className="stroke-neutral-200" />
      <circle
        cx="14"
        cy="14"
        r={RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - usedShare)}
        className="stroke-black transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}
