import { NextResponse } from "next/server";
import { finishSession } from "@/lib/training-service";
import { HttpError } from "@/lib/http";
import { requireUserId, errorResponse, toNumberOrNull } from "@/lib/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const sessionId = toNumberOrNull(body.sessionId);
    if (sessionId === null) throw new HttpError(400, "Не указан sessionId");

    const summary = await finishSession(userId, sessionId);
    return NextResponse.json(summary);
  } catch (e) {
    return errorResponse(e);
  }
}
