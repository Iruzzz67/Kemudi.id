"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { xrStore } from "@/components/simulation/xr/store";

// ─── Module-level VR-entry state ────────────────────────────────────────────
// The button remounts when the sim phase flips (select → walking), so a VR
// entry in progress must survive across instances. These are shared through a
// tiny external store instead of component useState.

type EntryState = { busy: boolean };
const entrySubscribers = new Set<() => void>();
let entryState: EntryState = { busy: false };
let activeEntryId = 0;

function subscribeEntry(fn: () => void) {
  entrySubscribers.add(fn);
  return () => {
    entrySubscribers.delete(fn);
  };
}

function setEntryBusy(busy: boolean) {
  entryState = { busy };
  entrySubscribers.forEach((fn) => fn());
}

function useEntryBusy() {
  return useSyncExternalStore(
    subscribeEntry,
    () => entryState.busy,
    () => false
  );
}

// ─── WebXR support detection ────────────────────────────────────────────────
// This button lives in the DOM, outside the <Canvas>, so it cannot use useXR()
// — that hook needs the XR context that only exists inside the Canvas. It reads
// the same zustand store directly instead.
function useIsPresenting() {
  return useSyncExternalStore(
    (onChange) => xrStore.subscribe(onChange),
    () => xrStore.getState().session != null,
    () => false
  );
}

// WebXR needs a secure context (HTTPS or localhost) AND a headset that reports
// immersive-vr support. The synchronous navigator check lives in a lazy
// initializer (not an effect) so we never call setState synchronously inside an
// effect body.
function useVRSessionSupported() {
  const [supported, setSupported] = useState<boolean | null>(() => {
    if (typeof navigator === "undefined" || !navigator.xr) {
      // WebXR needs a secure context. On plain http://<laptop-ip>:3000 the API
      // is hidden entirely — explain why the button is disabled instead of
      // letting it look like a regression.
      if (typeof window !== "undefined" && window.location.protocol !== "https:") {
        console.info(
          "[Kemudi.id] WebXR tidak tersedia di origin ini (butuh HTTPS atau localhost). " +
            "Untuk Oculus lewat LAN: set chrome://flags/#unsafely-treat-insecure-origin-as-secure " +
            "di Quest Browser, atau gunakan adb reverse tcp:3000 tcp:3000 lalu buka http://localhost:3000."
        );
      }
      return false;
    }
    return null;
  });

  useEffect(() => {
    if (supported !== null) return;
    let cancelled = false;
    navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then((ok) => {
        if (!cancelled) setSupported(ok);
      })
      .catch(() => {
        if (!cancelled) setSupported(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  return supported;
}

// enterVR() rejects until the <XR> component (inside the Canvas) has connected
// three.js to the store. On the vehicle-select screen the canvas only mounts a
// moment after the simulation starts, so retry briefly before giving up.
//
// The loop only retries on the specific "not connected" errors — once the
// manager is connected, the requestSession await suspends the loop, so at most
// ONE browser permission prompt can ever appear. It also exits early if the
// page becomes hidden or a newer entry attempt supersedes it (so a stale loop
// can never surface a prompt on an unrelated page).
async function enterVRWhenReady(entryId: number) {
  // Keep the deadline under Chrome's ~5s transient user-activation window so
  // the eventual requestSession() still counts as a user gesture.
  const deadline = Date.now() + 3500;
  for (;;) {
    if (entryId !== activeEntryId) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    try {
      await xrStore.enterVR();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Keep waiting only while the three.js connection is still coming up; a
      // real failure (user cancelled the prompt, unsupported device) stops it.
      if (!msg.includes("not connected") && !msg.includes("WebXR not supported")) {
        return;
      }
      if (Date.now() > deadline) return;
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}

export function VRToggleButton({
  onEnterVR,
}: {
  // Optional pre-step run before entering VR. The vehicle-select screen uses
  // this to start the simulation first — enterVR() needs the Canvas/<XR>
  // mounted, which only happens once the sim is running.
  onEnterVR?: () => void;
}) {
  const isPresenting = useIsPresenting();
  const supported = useVRSessionSupported();
  const busy = useEntryBusy();

  const available = supported === true;

  const handleClick = () => {
    if (isPresenting) {
      const session = xrStore.getState().session;
      session?.end().catch(() => {});
      return;
    }
    if (busy || !available) return;

    // Supersede any previous in-flight entry (e.g. a retry loop from an older
    // button instance that survived a phase change).
    const entryId = ++activeEntryId;
    setEntryBusy(true);
    Promise.resolve()
      .then(() => onEnterVR?.())
      .then(() => enterVRWhenReady(entryId))
      .finally(() => {
        if (entryId === activeEntryId) setEntryBusy(false);
      });
  };

  const label = isPresenting ? "Keluar VR" : busy ? "Menyiapkan VR..." : "Masuk VR";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={(!available && !isPresenting) || busy}
        title={
          !available && !isPresenting
            ? "VR tidak tersedia: butuh headset VR dan browser dengan WebXR (HTTPS atau localhost)"
            : undefined
        }
        className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all ${
          available || isPresenting
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105"
            : "cursor-not-allowed bg-neutral-400 opacity-70"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 14.5V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6.5" />
          <path d="M2 14.5a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 3 0V17h10v1.5a1.5 1.5 0 0 0 3 0V16.5a2 2 0 0 1 2-2" />
          <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
          <circle cx="17.5" cy="12.5" r="0.5" fill="currentColor" />
        </svg>
        {label}
      </button>
    </div>
  );
}
