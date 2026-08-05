import { resolveDashboardByUsernameSlug } from "@/lib/server/resolveDashboardByUsernameSlug";

function decodePngDataUrl(input) {
  if (typeof input !== "string") return null;
  const m = input.match(/^data:image\/png;base64,([A-Za-z0-9+/=\n\r]+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1], "base64");
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { username, slug } = req.query;
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const resolved = await resolveDashboardByUsernameSlug(username, slug, {
      req,
      select: "user_id og_image_data is_public public_slug",
    });
    if (!resolved?.dash?.og_image_data) return res.status(404).end("OG image not found");

    const png = decodePngDataUrl(resolved.dash.og_image_data);
    if (!png) return res.status(404).end("Invalid OG image");

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Cache-Control",
      resolved.isPublic
        ? "public, max-age=300, s-maxage=300, stale-while-revalidate=86400"
        : "private, no-store",
    );
    return res.status(200).send(png);
  } catch (error) {
    return res.status(500).end(error?.message || "Server error");
  }
}
