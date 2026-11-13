import { runResearchPack } from "@/lib/mcp/research/pack.js";
import { parseMentionIntent } from "./intent.js";

/**
 * X worker: same research kernel as MCP (`runResearchPack`).
 * Gate blocks empty/internal copy before deliver.
 */
export async function runXJarvisJob({
  text = "",
  parent_text = "",
  author_handle = "",
  deliver_default = "public_reply",
  live = false,
} = {}) {
  const packed = await runResearchPack({ text, parent_text, author_handle, deliver_default });
  return {
    as_of: packed.as_of,
    intent: packed.intent,
    status: packed.status === "blocked" ? "needs_clarification" : packed.status,
    draft_reply: packed.draft_reply || packed.x_reply || "",
    research: packed,
    live: false,
    gate: packed.gate,
    note: live
      ? "Live mode — cron/poll posts draft_reply when X_JARVIS_LIVE=1 and gate.can_post."
      : "Dry-run. Same pack as MCP jarvis_research.",
  };
}

export function draftFromIntentOnly(intent, { marketTitle = "Test market" } = {}) {
  if (intent.mode === "clarify") return intent.ask_user;
  if (intent.mode === "pulse") return "Hottest markets moved. Open Lychee for the brief.";
  if (intent.mode === "verify") return `Lychee data on that claim. → lycheedata.com/jarvis`;
  if (intent.mode === "news_impact") return `Markets this can hit. → lycheedata.com/jarvis`;
  return `On ${marketTitle}: Jarvis draft ready. → lycheedata.com/jarvis`;
}

export { parseMentionIntent };
