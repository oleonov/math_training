import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { requireUserId, errorResponse } from "@/lib/route-helpers";

// Code that protects the "wipe my progress" action. Server-side only, so it is
// never shipped to the browser. Override with RESET_PASSWORD if desired.
const RESET_PASSWORD = process.env.RESET_PASSWORD ?? "654654";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    if (typeof body.password !== "string" || body.password !== RESET_PASSWORD) {
      throw new HttpError(403, "Неверный код");
    }

    // Wipe this user's history/memory; keep the account and the shared cards.
    await prisma.attempt.deleteMany({ where: { userId } });
    await prisma.userCardStats.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
