// Manual end-to-end smoke test against a running server.
// Usage: node scripts/smoke.mjs  (server must be on http://localhost:3000)
const base = process.env.BASE ?? "http://localhost:3000";
let cookie = "";

async function post(path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const login = await post("/api/login", { name: "kid", password: "12345" });
console.log("LOGIN", login.status, JSON.stringify(login.json));
if (login.status !== 200) process.exit(1);

const start = await post("/api/session/start", { answerTimeLimitSec: 4, trainingDurationMin: 1 });
console.log("START", start.status, JSON.stringify(start.json));
if (start.status !== 200) process.exit(1);

let card = start.json.card;
const sessionId = start.json.sessionId;
console.log("first card isFirst =", card.isFirst);

for (let i = 0; i < 6; i++) {
  const correct = card.shownA * card.shownB;
  const userAnswer = i % 3 === 0 ? correct + 1 : correct; // every 3rd wrong
  const responseTimeMs = i % 2 === 0 ? 1500 : 6000; // every 2nd slow
  const r = await post("/api/session/answer", {
    sessionId,
    cardId: card.cardId,
    shownA: card.shownA,
    shownB: card.shownB,
    userAnswer,
    responseTimeMs,
  });
  console.log(
    `ANSWER ${i}: ${card.shownA}x${card.shownB} ans=${userAnswer} rt=${responseTimeMs} ->`,
    JSON.stringify(r.json.result),
    "| next",
    `${r.json.next.shownA}x${r.json.next.shownB}`,
  );
  card = r.json.next;
}

const finish = await post("/api/session/finish", { sessionId });
console.log("FINISH", finish.status, JSON.stringify(finish.json, null, 2));

// Auth must be required.
cookie = "";
const denied = await post("/api/session/start", { answerTimeLimitSec: 4, trainingDurationMin: 1 });
console.log("DENIED (no cookie) ->", denied.status, JSON.stringify(denied.json));

// Bad config must be rejected.
const badLogin = await post("/api/login", { name: "kid", password: "12345" });
const bad = await post("/api/session/start", { answerTimeLimitSec: 999, trainingDurationMin: 1 });
console.log("BAD CONFIG ->", bad.status, JSON.stringify(bad.json));
