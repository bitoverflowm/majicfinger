import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import { getLoginSession } from "@/lib/auth";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";

export default async function handler(req, res) {
    const {
        query: { id },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const chart = await Chart.findById(id);
                if (!chart) {
                    return res.status(400).json({ success: false, message: `No chart found for id: ${id}` });
                }
                res.status(200).json({ success: true, data: chart });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                const chart = await Chart.findById(id);
                if (!chart) {
                    return res.status(400).json({ success: false, message: `No chart found for id: ${id}` });
                }

                const wantsEmbed =
                    Object.prototype.hasOwnProperty.call(req.body, "public_slug") ||
                    Object.prototype.hasOwnProperty.call(req.body, "is_public");

                if (wantsEmbed) {
                    let session;
                    try {
                        session = await getLoginSession(req);
                    } catch {
                        session = null;
                    }
                    if (!session?.userId || String(chart.user_id) !== String(session.userId)) {
                        return res.status(401).json({ success: false, message: "Unauthorized" });
                    }
                }

                const $set = {
                    chart_name: req.body.chart_name,
                    chart_properties: req.body.chart_properties,
                    last_saved_date: new Date(),
                    labels: req.body.labels,
                };
                if (typeof req.body.og_image_url === "string" && req.body.og_image_url.trim()) {
                    $set.og_image_url = req.body.og_image_url.trim();
                    $set.og_image_updated_at = new Date();
                }

                const updateOp = { $set };

                if (wantsEmbed) {
                    const pub = !!req.body.is_public;
                    $set.is_public = pub;
                    if (pub) {
                        const raw = normalizeChartEmbedSlug(req.body.public_slug || req.body.chart_name || "");
                        if (!isValidChartEmbedSlug(raw)) {
                            return res.status(400).json({
                                success: false,
                                message: "Invalid embed slug (use lowercase letters, numbers, hyphens).",
                            });
                        }
                        const dup = await Chart.findOne({
                            user_id: chart.user_id,
                            public_slug: raw,
                            _id: { $ne: chart._id },
                        }).lean();
                        if (dup) {
                            return res.status(409).json({ success: false, message: "That slug is already used for one of your charts." });
                        }
                        $set.public_slug = raw;
                    } else {
                        updateOp.$unset = { public_slug: "" };
                    }
                }

                const updatedChart = await Chart.findByIdAndUpdate(id, updateOp, {
                    new: true,
                    runValidators: true,
                });
                if (!updatedChart) {
                    return res.status(400).json({ success: false , message: "there was an issue in updating the chart"});
                }
                res.status(200).json({ success: true, data: updatedChart });
            } catch (error) {
                res.status(400).json({ success: false});
            }
            break;
        case "DELETE":
            try {
                const deletedChart = await Chart.findByIdAndDelete(id);
                if (!deletedChart) {
                    return res.status(400).json({ success: false, message: `No Charts found for id: ${id}` });
                }
                res.status(200).json({ success: true, message: `Chart with id ${id} deleted successfully` });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        default:
            res.status(400).json({ success: false });
            break;
    }
}