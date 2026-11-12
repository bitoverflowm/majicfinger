import { registerOAuthClient } from "@/lib/mcp/auth/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const client = await registerOAuthClient(body);
    return Response.json(client, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: err?.message || "Registration failed" },
      { status: err?.status || 400 },
    );
  }
}
