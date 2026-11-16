// src/lib/toast.ts — global toast queue (SPEC §8, guardrail G6).
// Toasts belong to the root: only App.tsx mounts <ToastHost />; everything else
// calls showToast(message) — components emit, the root renders the truth.
// This module is deliberately React-free: a tiny module-level queue plus a
// subscribe API. No new dependency (G9) — ToastHost animates with RN Animated.
//
// Semantics: the LATEST message wins and stays visible ~2.5 s (re-showing
// resets the timer). A message emitted before ToastHost mounts is still picked
// up via getLatestToast() while it is fresh — App.tsx renders the host inside
// its gated shell, so an early failure toast is not silently dropped.

export type ToastState = {
  message: string;
  key: number; // monotonically increasing — lets the host re-trigger effects
  issuedAt: number; // Date.now() at emission — lets the host honor freshness
};

type ToastListener = (toast: ToastState) => void;

const listeners = new Set<ToastListener>();
let seq = 0;
let latest: ToastState | null = null;

// Fire a toast. Safe from anywhere (root layer or root-owned hooks — G6:
// components must NOT import this; `grep -rn "showToast" src/components/` stays
// empty). Show duration lives in ToastHost (VISIBLE_MS ≈ 2500).
export function showToast(message: string): void {
  seq += 1;
  latest = { message, key: seq, issuedAt: Date.now() };
  for (const listen of listeners) {
    listen(latest);
  }
}

// Last message ever shown (or null) — ToastHost checks it once on mount so a
// toast emitted before the host existed still displays if it is still fresh.
export function getLatestToast(): ToastState | null {
  return latest;
}

// Subscribe for changes; returns the unsubscribe function (cleanup-friendly).
export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
