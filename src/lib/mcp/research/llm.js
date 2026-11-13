import OpenAI from "openai";

/**
 * Jarvis's language model. Any OpenAI-compatible API works (OpenAI, OpenRouter, Groq, Together…):
 *   JARVIS_LLM_API_KEY   required to turn the model on
 *   JARVIS_LLM_BASE_URL  optional, e.g. https://openrouter.ai/api/v1
 *   JARVIS_LLM_MODEL     optional, defaults to DEFAULT_MODEL
 * Without a key, the research engine keeps its rule-based behaviour.
 */
const DEFAULT_MODEL = "gpt-4.1";
const TIMEOUT_MS = 30_000;

let client = null;

function apiKey() {
  return String(process.env.JARVIS_LLM_API_KEY || "").trim();
}

export function llmModel() {
  return String(process.env.JARVIS_LLM_MODEL || DEFAULT_MODEL).trim();
}

export function llmAvailable() {
  return Boolean(apiKey()) && process.env.JARVIS_LLM_DISABLED !== "1";
}

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: apiKey(),
      baseURL: process.env.JARVIS_LLM_BASE_URL || undefined,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return client;
}

/**
 * One JSON-returning model call, validated with a zod schema.
 * JSON mode (not strict schemas) so open-model providers work too; the shape is spelled out in `system`.
 */
export async function llmJson({ system, input, schema, temperature = 0.2 }) {
  const res = await getClient().chat.completions.create({
    model: llmModel(),
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${system}` },
      { role: "user", content: typeof input === "string" ? input : JSON.stringify(input, null, 2) },
    ],
  });
  const raw = res.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Model returned non-JSON: ${raw.slice(0, 200)}`);
  }
  const checked = schema.safeParse(parsed);
  if (!checked.success) {
    throw new Error(`Model JSON did not match schema: ${checked.error.message.slice(0, 300)}`);
  }
  return checked.data;
}
