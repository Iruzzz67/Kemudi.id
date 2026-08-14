import Link from "next/link";
import { notFound } from "next/navigation";
import { MENTORS } from "@/lib/kursus-data";
import { VEHICLES } from "@/lib/vehicles";

export function generateStaticParams() {
  return MENTORS.map((m) => ({ id: m.id }));
}

export default async function MentorPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mentor = MENTORS.find((m) => m.id === id);
  if (!mentor) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/kursus#mentor" className="text-sm font-medium text-blue-600 hover:underline">
        ← Kembali ke Daftar Mentor
      </Link>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ backgroundColor: mentor.avatarColor }}
        >
          {mentor.initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{mentor.name}</h1>
          <p className="text-neutral-500">{mentor.title}</p>
          <div className="mt-1 flex items-center gap-1 text-sm">
            <span className="text-amber-500">★</span>
            <span className="font-medium">{mentor.rating}</span>
            <span className="text-neutral-400">
              · {mentor.experienceYears} tahun pengalaman · {mentor.studentsTrained}+ murid dilatih
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {mentor.vehicleTypes.map((vt) => (
          <span
            key={vt}
            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: VEHICLES[vt].color }}
          >
            {VEHICLES[vt].label}
          </span>
        ))}
      </div>

      <p className="mt-6 leading-relaxed text-neutral-700 dark:text-neutral-300">{mentor.bio}</p>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Sertifikasi</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          {mentor.portfolio.certifications.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-blue-600">✓</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Pencapaian</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          {mentor.portfolio.achievements.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="text-blue-600">✓</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {mentor.portfolio.testimonials.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Testimoni Murid</h2>
          <div className="mt-3 space-y-3">
            {mentor.portfolio.testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800"
              >
                <p className="italic text-neutral-700 dark:text-neutral-300">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-2 text-xs font-medium text-neutral-400">— {t.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/kursus/personal?mentor=${mentor.id}`}
        className="mt-10 inline-block rounded-full bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
      >
        Lanjutkan Pendaftaran
      </Link>
    </div>
  );
}
