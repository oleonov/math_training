import { PrismaClient } from "@prisma/client";
import { generateCards } from "../src/lib/cards";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

// Initial users. Add more here — one line each — to give every child their own
// progress. Passwords are hashed before storage.
const USERS = [{ name: "Amelia", password: "12345" }];

async function main() {
  const cards = generateCards();
  for (const c of cards) {
    await prisma.card.upsert({
      where: { a_b: { a: c.a, b: c.b } },
      update: { answer: c.answer },
      create: c,
    });
  }

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { name: u.name },
      update: {},
      create: { name: u.name, passwordHash: await hashPassword(u.password) },
    });
  }

  console.log(`Seeded ${cards.length} cards and ${USERS.length} user(s): ${USERS.map((u) => u.name).join(", ")}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
