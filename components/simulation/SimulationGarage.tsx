"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowRight, Bike, CarFront, Check, CircleHelp, Footprints, Gauge, Glasses, Keyboard, Pause, Play, Rotate3d, Settings2, ShieldCheck, Truck, Volume2, VolumeX } from "lucide-react";
import { useSimStore } from "@/store/simStore";
import { VEHICLES, type VehicleType } from "@/lib/vehicles";
import { HandlingSettingsPanel } from "./HandlingSettingsPanel";
import { vehicleAudio } from "./audio/vehicleAudio";
import "./garage.css";

const VehiclePreview = dynamic(() => import("./VehiclePreview"), { ssr: false, loading: () => <div className="garage-preview-message" role="status">Menyiapkan pratinjau 3D…</div> });
const options = [
  { type: "MOTOR" as VehicleType, icon: Bike, label: "Motor", subtitle: "Lincah di setiap tikungan", badge: "SIM C", model: "Urban 125", level: "Menengah" },
  { type: "MOBIL" as VehicleType, icon: CarFront, label: "Mobil", subtitle: "Awal yang tepat untuk belajar", badge: "SIM A", model: "City Hatchback", level: "Pemula" },
  { type: "TRUK" as VehicleType, icon: Truck, label: "Truk", subtitle: "Kendali besar, tanggung jawab besar", badge: "SIM B1", model: "Cargo 6×2", level: "Lanjutan" },
];

export function SimulationGarage() {
  const vehicle = useSimStore(s => s.vehicle);
  const setVehicle = useSimStore(s => s.setVehicle);
  const transmission = useSimStore(s => s.transmissionMode);
  const setTransmission = useSimStore(s => s.setTransmissionMode);
  const [muted, setMuted] = useState(() => vehicleAudio.isMuted());
  const [playing, setPlaying] = useState(false);
  const [handling, setHandling] = useState(false);
  const [help, setHelp] = useState(false);
  const current = options.find(o => o.type === vehicle)!;
  const config = VEHICLES[vehicle];
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (media.matches) setPlaying(false); };
    media.addEventListener("change", stop);
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hide);
    return () => { media.removeEventListener("change", stop); document.removeEventListener("visibilitychange", hide); };
  }, []);
  const start = () => {
    vehicleAudio.start(); vehicleAudio.setMuted(muted);
    useSimStore.getState().startWalking();
  };
  return (
    <div className="sim-garage">
      <div className="garage-heading">
        <div><p className="garage-eyebrow"><span /> KEMUDI DRIVING LAB</p><h1>Perjalananmu dimulai di sini.</h1><p>Pilih kendaraan, kenali kendalinya, lalu jelajahi lintasan.</p></div>
        <span className="garage-mode"><Glasses size={18} aria-hidden="true" /> Desktop & VR</span>
      </div>
      <ol className="garage-steps" aria-label="Tahapan latihan">
        <li aria-current="step"><span>01</span> Pilih kendaraan</li><li><span>02</span> Persiapan berkendara</li><li><span>03</span> Mulai perjalanan</li>
      </ol>
      <div className="garage-layout">
        <section className="garage-showroom" aria-label={`Pratinjau ${current.label}`}>
          <div className="garage-model-title"><div><p className="garage-eyebrow">KENALI KENDARAANMU</p><h2>{current.model}</h2></div><span className="garage-tag">{current.badge}</span></div>
          <div className="garage-canvas"><VehiclePreview key={vehicle} vehicle={vehicle} playing={playing} /></div>
          <div className="garage-view-controls"><span><Rotate3d size={16} aria-hidden="true" /> Seret untuk melihat sekeliling</span><button type="button" onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Jeda animasi" : "Lihat animasi"}</button></div>
          <div className="garage-specs"><div><Gauge size={18} aria-hidden="true" /><span>Kecepatan maks.<strong>{Math.round(config.maxSpeed*3.6)} <small>km/j</small></strong></span></div><div><ShieldCheck size={18} aria-hidden="true" /><span>Tingkat latihan<strong>{current.level}</strong></span></div><div><CarFront size={18} aria-hidden="true" /><span>Posisi pengemudi<strong>{vehicle === "MOTOR" ? "Tengah" : "Setir kanan"}</strong></span></div></div>
        </section>
        <section className="garage-setup" aria-labelledby="setup-heading">
          <div className="garage-section-title"><span>01 / KENDARAAN</span><h2 id="setup-heading">Pilih teman perjalanan.</h2></div>
          <div className="garage-vehicles" role="group" aria-label="Pilih kendaraan">
            {options.map(({ type, icon: Icon, label, subtitle, badge }) => <button type="button" className={`garage-vehicle ${vehicle===type ? "is-selected" : ""}`} key={type} aria-pressed={vehicle===type} onClick={() => setVehicle(type)}><span className="garage-vehicle-icon"><Icon size={24} aria-hidden="true" /></span><span className="garage-vehicle-copy"><strong>{label}<small>{badge}</small></strong><span>{subtitle}</span></span><span className="garage-selected-mark">{vehicle===type && <Check size={15} aria-hidden="true" />}</span></button>)}
          </div>
          <fieldset className="garage-transmission"><legend>02 / TRANSMISI</legend><div>{(["automatic","manual"] as const).map(mode => <button type="button" key={mode} aria-pressed={transmission===mode} className={transmission===mode ? "is-selected" : ""} onClick={() => setTransmission(mode)}><strong>{mode==="automatic" ? "Otomatis" : "Manual"}</strong><span>{mode==="automatic" ? "Fokus gas & rem" : "Latihan kopling & gigi"}</span>{transmission===mode && <Check size={14} aria-hidden="true" />}</button>)}</div><p>{transmission==="automatic" ? "Pilihan nyaman untuk mengenal lintasan pertama kali." : "Tahan Shift untuk kopling, lalu gunakan Q / E untuk pindah gigi."}</p></fieldset>
          <div className="garage-preferences"><button type="button" onClick={() => setHandling(true)}><Settings2 size={17} aria-hidden="true" /> Atur kendali</button><button type="button" aria-pressed={muted} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{muted ? "Suara mati" : "Suara aktif"}</button></div>
          <button type="button" className="garage-start" onClick={start}>Mulai latihan {current.label.toLowerCase()}<ArrowRight size={20} aria-hidden="true" /></button>
          <p className="garage-start-note"><Footprints size={14} aria-hidden="true" /> Dimulai dari area parkir. Masuk dan siapkan kendaraanmu.</p>
        </section>
      </div>
      <div className="garage-bottom"><div><span className="garage-tip-icon"><Glasses size={22} aria-hidden="true" /></span><p><strong>Punya headset VR?</strong><span>Mulai latihan, lalu pilih Masuk VR. Gunakan browser headset dengan koneksi HTTPS.</span></p></div><button type="button" aria-expanded={help} aria-controls="garage-help" onClick={() => setHelp(!help)}><CircleHelp size={18} aria-hidden="true" /> Panduan kontrol</button></div>
      {help && <section id="garage-help" className="garage-help"><h2><Keyboard size={20} aria-hidden="true" /> Kontrol dasar</h2><dl><div><dt>W A S D / panah</dt><dd>Berjalan, gas, rem, dan belok</dd></div><div><dt>I · B · Space</dt><dd>Kontak mesin · sabuk · rem tangan</dd></div><div><dt>Shift · Q / E</dt><dd>Kopling · turun / naik gigi</dd></div><div><dt>C · P</dt><dd>Ganti kamera · jeda latihan</dd></div></dl><p>Setelah masuk kendaraan, ikuti checklist di layar. Kontrol VR tersedia pada panel di dalam kabin.</p></section>}
      {handling && <HandlingSettingsPanel onClose={() => setHandling(false)} />}
    </div>
  );
}
