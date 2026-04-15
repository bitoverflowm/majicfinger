import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import { getLoginSession } from "@/lib/auth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

function parsePngDataUrl(input) {
  if (typeof input !== "string") return null;
  const m = input.match(/^data:image\/png;base64,([A-Za-z0-9+/=\n\r]+)$/);
  if (!m) return null;
  return { dataUrl: `data:image/png;base64,${m[1]}`, bytes: Buffer.from(m[1], "base64").length };
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  try {
    const session = await getLoginSession(req);
    if (!session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const chart = await Chart.findById(id);
    if (!chart) {
      return res.status(404).json({ success: false, message: "Chart not found" });
    }
    if (String(chart.user_id) !== String(session.userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const parsed = parsePngDataUrl(req.body?.imageDataUrl);
    if (!parsed || parsed.bytes === 0) {
      return res.status(400).json({ success: false, message: "Invalid PNG data URL" });
    }
    if (parsed.bytes > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image exceeds 5MB limit" });
    }

    // Serverless-safe: store image payload in DB and serve through a public API route.
    chart.og_image_data = parsed.dataUrl;
    chart.og_image_updated_at = new Date();
    await chart.save();

    return res.status(200).json({ success: true, data: { stored: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || "Upload failed" });
  }
}

