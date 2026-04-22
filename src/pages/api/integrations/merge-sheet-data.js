import { mergeSheetColumns } from "@/lib/integrations/sheetMerge";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { existingRows, incomingRows, pivotColumn } = req.body || {};
    const merged = mergeSheetColumns(
      Array.isArray(existingRows) ? existingRows : [],
      Array.isArray(incomingRows) ? incomingRows : [],
      { pivotColumn: pivotColumn ?? null },
    );
    return res.status(200).json({ data: merged });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Merge failed" });
  }
}
