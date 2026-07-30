import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_VEHICLES = ["MOTOR", "MOBIL", "TRUK"] as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Harus login." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const vehicleType = body?.vehicleType;
  const score = Number(body?.score);
  const timeTakenMs = Number(body?.timeTakenMs);
  const violations = Number(body?.violations);
  const offRoadCount = Number(body?.offRoadCount);
  const completed = Boolean(body?.completed);

  if (
    !VALID_VEHICLES.includes(vehicleType) ||
    !Number.isFinite(score) ||
    !Number.isFinite(timeTakenMs) ||
    !Number.isFinite(violations) ||
    !Number.isFinite(offRoadCount)
  ) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const attempt = await prisma.simulationAttempt.create({
    data: {
      userId: session.user.id,
      vehicleType,
      score: Math.round(Math.max(0, Math.min(100, score))),
      timeTakenMs: Math.round(Math.max(0, timeTakenMs)),
      violations: Math.round(Math.max(0, violations)),
      offRoadCount: Math.round(Math.max(0, offRoadCount)),
      completed,
    },
  });

  return NextResponse.json(attempt);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Harus login." }, { status: 401 });
  }

  const attempts = await prisma.simulationAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(attempts);
}
