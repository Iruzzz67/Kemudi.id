import Link from "next/link";
import { MATERI_LIST } from "@/lib/materi-data";

export default function MateriPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Materi Kursus</h1>
      <p className="mt-2 text-neutral-500">
        Pahami teori dasar sebelum mencoba simulasi mengemudi.
      </p>

      <div className="mt-8 space-y-4">
        {MATERI_LIST.map((m) => (
          <Link
            key={m.slug}
            href={`/materi/${m.slug}`}
            className="block rounded-xl border border-neutral-200 p-5 transition hover:border-blue-400 dark:border-neutral-800"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-blue-600">
              {m.category}
            </span>
            <div className="mt-1 text-lg font-semibold">{m.title}</div>
            <p className="mt-1 text-sm text-neutral-500">{m.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
