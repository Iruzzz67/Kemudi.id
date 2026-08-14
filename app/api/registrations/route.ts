import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Membuat pendaftaran kursus (publik — dipanggil form Data Diri & Pembayaran).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const mentorId = typeof body?.mentorId === "string" ? body.mentorId.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const nik = typeof body?.nik === "string" ? body.nik.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : "";
  const amount = typeof body?.amount === "number" ? Math.round(body.amount) : 350_000;
  const startDate = typeof body?.startDate === "string" ? body.startDate.trim() : "";

  if (!mentorId || !name || !email || !nik || !address) {
    return NextResponse.json(
      { error: "Mentor, nama, email, NIK, dan alamat wajib diisi." },
      { status: 400 }
    );
  }
  if (!["transfer", "e-wallet", "cash"].includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Metode pembayaran tidak valid." },
      { status: 400 }
    );
  }

  // Tautkan ke akun yang sedang login bila ada (opsional — pendaftaran bisa
  // dilakukan tanpa login).
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const registration = await prisma.courseRegistration.create({
    data: {
      userId,
      mentorId,
      name,
      email,
      phone,
      nik,
      address,
      paymentMethod,
      amount,
      status: "pending",
      startDate,
    },
  });

  return NextResponse.json({ id: registration.id }, { status: 201 });
}

// Mendaftar semua pendaftaran — HANYA admin yang boleh melihat & mengonfirmasi
// status pembayaran. Pengguna lain mendapat 403.
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrations = await prisma.courseRegistration.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ registrations });
}
