"use client";

import { useEffect, useState } from "react";
import { Glasses, LoaderCircle } from "lucide-react";
import { xrStore } from "./store";

export function VRSessionButton() {
  const [supported, setSupported] = useState(false);
  const [message, setMessage] = useState("Memeriksa dukungan VR…");
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      let ok = false;
      let hint = "VR tidak tersedia di browser ini. Latihan desktop tetap tersedia.";
      if (!window.isSecureContext) hint = "Untuk VR, buka melalui HTTPS atau localhost di browser headset.";
      else if (navigator.xr) {
        try { ok = await navigator.xr.isSessionSupported("immersive-vr"); } catch { /* Keep desktop available. */ }
      }
      if (alive) { setSupported(ok); setMessage(ok ? "Headset siap. Pilih Masuk VR untuk melanjutkan." : hint); }
    };
    void check();
    navigator.xr?.addEventListener("devicechange", check);
    const unsubscribe = xrStore.subscribe(s => { if (alive) setActive(Boolean(s.session)); });
    return () => { alive = false; unsubscribe(); navigator.xr?.removeEventListener("devicechange", check); };
  }, []);
  const toggle = async () => {
    setPending(true);
    try {
      if (xrStore.getState().session) await xrStore.getState().session!.end();
      else {
        const session = await xrStore.enterVR();
        if (!session) throw new Error("Sesi VR tidak dapat dimulai.");
      }
      setMessage("Headset siap. Pilih Masuk VR untuk melanjutkan.");
    } catch { setMessage("Sesi VR belum dimulai. Periksa izin dan koneksi headset, lalu coba lagi."); }
    finally { setPending(false); }
  };
  return <div className="absolute right-4 top-44 z-20 flex w-44 flex-col items-end gap-2">
    <button type="button" onClick={toggle} disabled={pending || (!supported && !active)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-70" aria-describedby="vr-session-status">
      {pending ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Glasses size={18} aria-hidden="true" />}{pending ? "Menghubungkan…" : active ? "Keluar VR" : "Masuk VR"}
    </button><p id="vr-session-status" role="status" className="max-w-sm rounded-lg bg-slate-950/85 px-3 py-2 text-center text-xs leading-relaxed text-slate-200">{message}</p>
  </div>;
}
