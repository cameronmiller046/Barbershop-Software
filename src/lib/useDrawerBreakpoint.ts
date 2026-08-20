"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/** Tailwind's `md` — where the mobile drawer gives way to the fixed sidebar. */
export const MD_BREAKPOINT_PX = 768;

/**
 * Close a mobile nav drawer as soon as the viewport reaches the desktop
 * breakpoint.
 *
 * The drawer is a second copy of the whole sidebar, mounted only while `open`
 * and hidden past the breakpoint by a `md:hidden` class. Leaving `open` true
 * after a resize therefore keeps that copy in the DOM: screen readers announce
 * two navigation landmarks, and while a window is dragged across the boundary
 * both the drawer and the real sidebar can paint at once — the duplicated
 * sidebar seen at tablet widths. Dropping the state at the breakpoint unmounts
 * it, so the CSS class is a backstop rather than the only thing hiding it.
 */
export function useCloseDrawerOnDesktop(
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  minWidthPx: number = MD_BREAKPOINT_PX,
) {
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    // Already past the breakpoint (e.g. the drawer was opened, then the window
    // was resized before this effect ran) — close immediately.
    if (mq.matches) { setOpen(false); return; }
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open, setOpen, minWidthPx]);
}
