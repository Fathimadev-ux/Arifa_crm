/**
 * One calm motion style for the CRM. Tune speed here; the CSS side lives in globals.css (--ease-smooth).
 * Springs: lower stiffness = slower, higher damping = less bounce.
 */

/** Same curve as --ease-smooth: a quick start that settles slowly. */
export const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

/** Each page fading in on navigation. */
export const PAGE_TRANSITION = { duration: 0.6, ease: EASE_SMOOTH };

/** Menus, the bell panel and the search dialog opening and closing. */
export const POPOVER_SPRING = { type: "spring", stiffness: 260, damping: 30 } as const;

/** Cards and list rows moving to their new place (e.g. a deal changing stage). */
export const LAYOUT_SPRING = { type: "spring", stiffness: 200, damping: 30 } as const;

/** Toast messages sliding up. */
export const TOAST_SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;

/** Dimmed backdrops fading. */
export const FADE = { duration: 0.3, ease: EASE_SMOOTH };

/** Bars, pills and counters growing into place, with a small stagger between items. */
export const GROW_DURATION = 1;
export const STAGGER_STEP = 0.08;
