import Trainer from "@/components/Trainer";

// Guest mode: no auth gate. Everything runs client-side (guest-engine.ts) — no
// session is stored on the server; records live in the browser's localStorage.
export default function GuestPage() {
  return <Trainer guest />;
}
