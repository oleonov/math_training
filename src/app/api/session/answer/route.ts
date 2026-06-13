import { NextResponse } from "next/server";
import { recordAnswer } from "@/lib/training-service";
import { HttpError } from "@/lib/http";
import { requireUserId, errorResponse, toNumberOrNull } from "@/lib/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));

    const sessionId = toNumberOrNull(body.sessionId);
    const cardId = toNumberOrNull(body.cardId);
    const shownA = toNumberOrNull(body.shownA);
    const shownB = toNumberOrNull(body.shownB);
    const responseTimeMs = toNumberOrNull(body.responseTimeMs);
    // userAnswer may legitimately be null (blank); anything non-numeric -> null.
    const userAnswer = body.userAnswer === null ? null : toNumberOrNull(body.userAnswer);

    if (sessionId === null || cardId === null || shownA === null || shownB === null || responseTimeMs === null) {
      throw new HttpError(400, "Некорректные данные ответа");
    }

    const result = await recordAnswer(userId, {
      sessionId,
      cardId,
      shownA,
      shownB,
      userAnswer,
      responseTimeMs: Math.max(0, Math.round(responseTimeMs)),
    });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
