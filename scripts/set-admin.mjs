// ─── Jadikan pengguna sebagai admin ────────────────────────────────────────
// Penggunaan:
//   node scripts/set-admin.mjs <email>
// Contoh:
//   node scripts/set-admin.mjs admin@kemudi.id
//
// Alternatif: daftarkan akun baru dengan email yang sama dengan isi env
// ADMIN_EMAILS di .env (dipisah koma), otomatis berperan ADMIN.

import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

// Muat .env secara manual agar skrip jalan tanpa flag khusus Node.
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Penggunaan: node scripts/set-admin.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });
  console.log(`✅ ${user.email} kini berperan ${user.role}`);
} catch (err) {
  if (err?.code === "P2025") {
    console.error(`❌ Pengguna dengan email "${email}" tidak ditemukan.`);
  } else {
    console.error("❌ Gagal mengubah role:", err?.message ?? err);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
