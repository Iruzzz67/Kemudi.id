import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMateriBySlug, MATERI_LIST } from "@/lib/materi-data";

export function generateStaticParams() {
  return MATERI_LIST.map((m) => ({ slug: m.slug }));
}

export default async function MateriDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const materi = getMateriBySlug(slug);
  if (!materi) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/materi" className="text-sm font-medium text-blue-600 hover:underline">
        ← Kembali ke Materi
      </Link>

      <span className="mt-4 block text-xs font-medium uppercase tracking-wide text-blue-600">
        {materi.category}
      </span>
      <h1 className="mt-1 text-3xl font-bold">{materi.title}</h1>
      <p className="mt-3 text-neutral-500">{materi.summary}</p>

      <div className="mt-8 space-y-4">
        {materi.content.map((paragraph, i) => (
          <Fragment key={i}>
            <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
              {paragraph}
            </p>

            {materi.images
              ?.filter((img) => (img.afterParagraph ?? 0) === i)
              .map((img) => (
                <figure
                  key={img.src}
                  className="my-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      width={640}
                      height={360}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="max-h-72 w-auto max-w-full rounded-lg object-contain"
                    />
                  </div>
                  <figcaption className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800">
                    {img.caption}{" "}
                    <a
                      href={img.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      (Sumber)
                    </a>
                  </figcaption>
                </figure>
              ))}
          </Fragment>
        ))}
      </div>

      <Link
        href="/simulasi"
        className="mt-10 inline-block rounded-full bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
      >
        Coba di Simulasi
      </Link>
    </div>
  );
}
