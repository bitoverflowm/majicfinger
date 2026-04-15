import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";
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
                const bento = await Bento.findById(id);
                if (!bento) {
                    return res.status(400).json({ success: false, message: `No bentos found for id: ${id}` });
                }
                res.status(200).json({ success: true, data: bento });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                const bento = await Bento.findById(id);
                if (!bento) {
                    return res.status(400).json({ success: false, message: `No bentos found for id: ${id}` });
                }

                const wantsEmbed =
                    Object.prototype.hasOwnProperty.call(req.body, "public_slug") ||
                    Object.prototype.hasOwnProperty.call(req.body, "is_public");

                let updateOp;
                if (!wantsEmbed) {
                    updateOp = { $set: { ...req.body } };
                } else {
                    const $set = { ...req.body };
                    delete $set.public_slug;
                    delete $set.is_public;

                    updateOp = {};

                    let session;
                    try {
                        session = await getLoginSession(req);
                    } catch {
                        session = null;
                    }
                    if (!session?.userId || String(bento.user_id) !== String(session.userId)) {
                        return res.status(401).json({ success: false, message: "Unauthorized" });
                    }

                    const pub = !!req.body.is_public;
                    $set.is_public = pub;
                    if (pub) {
                        const raw = normalizeChartEmbedSlug(
                            req.body.public_slug || req.body.project_name || "",
                        );
                        if (!isValidChartEmbedSlug(raw)) {
                            return res.status(400).json({
                                success: false,
                                message: "Invalid public slug (use lowercase letters, numbers, hyphens).",
                            });
                        }
                        const dup = await Bento.findOne({
                            user_id: bento.user_id,
                            public_slug: raw,
                            _id: { $ne: bento._id },
                        }).lean();
                        if (dup) {
                            return res.status(409).json({
                                success: false,
                                message: "That slug is already used for one of your dashboards.",
                            });
                        }
                        $set.public_slug = raw;
                    } else {
                        updateOp.$unset = { public_slug: "" };
                    }
                    updateOp.$set = $set;
                }

                const updatedBento = await Bento.findByIdAndUpdate(id, updateOp, {
                    new: true,
                    runValidators: true,
                });
                if (!updatedBento) {
                    return res.status(400).json({ success: false , message: "there was an issue in updating the bento"});
                }
                res.status(200).json({ success: true, data: updatedBento });
            } catch (error) {
                res.status(400).json({ success: false});
            }
            break;
        case "DELETE":
            try {
                const deletedBento = await Bento.findByIdAndDelete(id);
                if (!deletedBento) {
                    return res.status(400).json({ success: false, message: `No bentos found for id: ${id}` });
                }
                res.status(200).json({ success: true, message: `Bento with id ${id} deleted successfully` });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        default:
            res.status(400).json({ success: false });
            break;
    }
}