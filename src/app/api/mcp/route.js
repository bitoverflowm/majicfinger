import { handleMcpHttp } from "@/lib/mcp/http";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request) {
  return handleMcpHttp(request);
}

export async function POST(request) {
  return handleMcpHttp(request);
}

export async function DELETE(request) {
  return handleMcpHttp(request);
}

export async function OPTIONS(request) {
  return handleMcpHttp(request);
}
