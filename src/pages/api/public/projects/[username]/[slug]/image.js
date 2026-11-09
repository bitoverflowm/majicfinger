import { imageFromDataUrl, resolvePublication } from "@/lib/server/workspacePublication";

/**
 * A published project's pictures: `?kind=og` (the uploaded social image, else the generated one)
 * or `?kind=header` (the page's banner). Social previews must load without a password.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const header = req.query.kind === "header";
  let found;
  try {
    found = await resolvePublication(req.query.username, req.query.slug, { select: header ? "+header_image" : "+og_image +og_auto" });
  } catch {
    return res.status(503).end();
  }
  const publication = found?.publication;
  const image = imageFromDataUrl(header ? publication?.header_image : publication?.og_image || publication?.og_auto);
  if (!image) {
    res.setHeader("Location", "/og/lychee-research-terminal.png");
    return res.status(header ? 404 : 302).end();
  }
  res.setHeader("Content-Type", image.type);
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).send(image.body);
}
