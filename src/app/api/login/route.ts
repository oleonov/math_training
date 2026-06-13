import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSession } from "@/lib/session-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !password) {
    return NextResponse.json({ error: "Введите имя и пароль" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { name } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Неверное имя или пароль" }, { status: 401 });
  }

  await setSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name } });
}
