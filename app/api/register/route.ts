import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Email valid dan password minimal 6 karakter diperlukan." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar." },
      { status: 409 }
    );
  }

  // Email yang terdaftar di env ADMIN_EMAILS (dipisah koma) otomatis jadi
  // admin. Contoh: ADMIN_EMAILS="admin@kemudi.id,admin2@kemudi.id"
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      password: hashed,
      role: adminEmails.includes(email) ? "ADMIN" : "USER",
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
