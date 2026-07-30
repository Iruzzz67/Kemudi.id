import Link from "next/link";
import { VEHICLE_ORDER, VEHICLES } from "@/lib/vehicles";
import { MATERI_LIST } from "@/lib/materi-data";

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Belajar Mengemudi, <span className="text-blue-600">Sebelum Turun ke Jalan</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-500">
          Kemudi.id adalah kursus mengemudi online dengan simulasi 3D interaktif.
          Latih refleks dan kontrolmu mengendarai motor, mobil, dan truk langsung dari browser.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/simulasi"
            className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Coba Simulasi
          </Link>
          <Link
            href="/kursus"
            className="rounded-full border border-neutral-300 px-8 py-3 font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Lihat Kursus
          </Link>
          <Link
            href="/materi"
            className="rounded-full border border-neutral-300 px-8 py-3 font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Lihat Materi
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">Tiga Jenis Kendaraan</h2>
        <p className="mt-1 text-neutral-500">
          Setiap kendaraan disimulasikan dengan karakteristik fisika yang berbeda.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VEHICLE_ORDER.map((type) => {
            const cfg = VEHICLES[type];
            return (
              <div
                key={type}
                className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
              >
                <div
                  className="mb-3 h-3 w-12 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <div className="text-lg font-semibold">{cfg.label}</div>
                <p className="mt-1 text-sm text-neutral-500">{cfg.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Materi Terbaru</h2>
          <Link href="/materi" className="text-sm font-medium text-blue-600 hover:underline">
            Lihat semua
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MATERI_LIST.slice(0, 4).map((m) => (
            <Link
              key={m.slug}
              href={`/materi/${m.slug}`}
              className="rounded-xl border border-neutral-200 p-5 transition hover:border-blue-400 dark:border-neutral-800"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-blue-600">
                {m.category}
              </span>
              <div className="mt-1 font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-neutral-500">{m.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
