import { NextResponse } from "next/server";
import { startSession } from "@/lib/training-service";
import { requireUserId, errorResponse, toNumberOrNull } from "@/lib/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const result = await startSession(
      userId,
      toNumberOrNull(body.answerTimeLimitSec) ?? 0,
      toNumberOrNull(body.trainingDurationMin) ?? 0,
      Array.isArray(body.numbers) ? body.numbers : [],
    );
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
