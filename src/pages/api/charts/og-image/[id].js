import fs from "fs/promises";
import path from "path";
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
  return Buffer.from(m[1], "base64");
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

    const imageBuffer = parsePngDataUrl(req.body?.imageDataUrl);
    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid PNG data URL" });
    }

    const relDir = path.join("og", "charts");
    const absDir = path.join(process.cwd(), "public", relDir);
    await fs.mkdir(absDir, { recursive: true });

    const ts = Date.now();
    const fileName = `${id}-${ts}.png`;
    const absFile = path.join(absDir, fileName);
    await fs.writeFile(absFile, imageBuffer);

    const imagePath = `/${relDir}/${fileName}`;
    chart.og_image_url = imagePath;
    chart.og_image_updated_at = new Date();
    await chart.save();

    return res.status(200).json({ success: true, data: { og_image_url: imagePath } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || "Upload failed" });
  }
}

