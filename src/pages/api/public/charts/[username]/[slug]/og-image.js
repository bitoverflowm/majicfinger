import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import User from "@/models/Users";

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
    await dbConnect();
    const user = await User.findOne({ user_name: String(username || "").trim() }).select("_id").lean();
    if (!user) return res.status(404).end("User not found");

    const chart = await Chart.findOne({
      user_id: user._id,
      public_slug: String(slug || "").trim(),
      is_public: true,
    })
      .select("og_image_data")
      .lean();
    if (!chart?.og_image_data) return res.status(404).end("OG image not found");

    const png = decodePngDataUrl(chart.og_image_data);
    if (!png) return res.status(404).end("Invalid OG image");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(png);
  } catch (error) {
    return res.status(500).end(error?.message || "Server error");
  }
}

