import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session-server";
import { prisma } from "@/lib/db";
import Trainer from "@/components/Trainer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) redirect("/login");

  return <Trainer userName={user.name} />;
}
