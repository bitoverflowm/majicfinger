import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import mongoose from 'mongoose';
import { assertQueryUserMatchesSession, requireLoginSession } from "@/lib/resourceOwnership";
import { buildLightweightDataSetListPipeline } from "@/lib/dataSetListQuery";
import {
    buildProjectRevision,
    sanitizeProvenanceSheetsForPersist,
    summarizeDataSetForList,
} from "@/lib/projectPersistence";
import {
    summarizeAdvancedDataStorage,
    userCanUseAdvancedDataStorage,
} from "@/lib/projectStorageEntitlements";
import { parseJsonBodyMaybeGzip } from "@/lib/parseJsonBodyMaybeGzip";

/** Accept gzip-compressed JSON bodies (see `gzipJsonTransport.js`). */
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const session = await requireLoginSession(req, res);
                if (!session) return;
                if (!assertQueryUserMatchesSession(uid, session, res)) return;
                const savedDataSets = await DataSet.aggregate(
                    buildLightweightDataSetListPipeline(session.userId),
                ).exec();

                res.status(200).json({
                    success: true,
                    data: (savedDataSets || []).map(summarizeDataSetForList),
                });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
            break;
        case "POST":
            try {
                const session = await requireLoginSession(req, res);
                if (!session) return;
                let body;
                try {
                    body = await parseJsonBodyMaybeGzip(req);
                } catch (parseErr) {
                    return res.status(400).json({ success: false, message: parseErr?.message || "Invalid request body" });
                }
                const { data_set_name, data, data_sheets, created_date, last_saved_date, labels, source } = body || {};
                const ownerId = new mongoose.Types.ObjectId(String(session.userId));
                const storageSummary = summarizeAdvancedDataStorage(data_sheets);
                if (storageSummary.requiresAdvancedStorage) {
                    const user = await User.findById(ownerId).lean();
                    if (!userCanUseAdvancedDataStorage(user)) {
                        return res.status(403).json({
                            success: false,
                            code: "ADVANCED_DATA_STORAGE_REQUIRED",
                            message: "Elite or lifetime access is required to save projects with sheets above the advanced data storage row limit.",
                            requiredTier: "elite",
                            storageSummary,
                        });
                    }
                }
                const sanitizedSheets = sanitizeProvenanceSheetsForPersist(
                    data_sheets && typeof data_sheets === "object" ? data_sheets : {},
                );
                const firstInline = Object.values(sanitizedSheets).find((s) => Array.isArray(s?.data) && s.data.length);
                const newDataSet = await DataSet.create({
                    data_set_name,
                    data: firstInline?.data || [],
                    data_sheets: sanitizedSheets,
                    created_date: new Date(created_date),
                    last_saved_date: new Date(last_saved_date),
                    labels,
                    source,
                    save_revision: buildProjectRevision({ data_set_name, data_sheets, labels, source }),
                    save_meta: {
                        saveMode: "full",
                        savedAt: new Date().toISOString(),
                    },
                    user_id: ownerId,
                });

                res.status(201).json({ success: true, data: newDataSet });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}
