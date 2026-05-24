import { mutateUser } from "@/lib/hooks";

/** Mark the one-time interactive run-yourself session as consumed (re-enable paywall). */
export async function consumeRunYourselfInteractiveSession() {
  try {
    const res = await fetch("/api/run-yourself/consume-interactive-session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.consumed) {
      await mutateUser();
    }
    return json;
  } catch {
    return { success: false };
  }
}
