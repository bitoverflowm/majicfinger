import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId
import { buildProjectRevision, summarizeDataSetForList } from "@/lib/projectPersistence";
import {
    summarizeAdvancedDataStorage,
    userCanUseAdvancedDataStorage,
} from "@/lib/projectStorageEntitlements";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "16mb",
        },
    },
};

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
    } = req;
    const { data_set_name, data, data_sheets, created_date, last_saved_date, labels, source, user_id } = req.body || {};

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const savedDataSets = await DataSet.find({ user_id: uid })
                    .select('data_set_name created_date last_saved_date labels source user_id data_sheets')
                    .lean()
                    .exec();

                if (!savedDataSets || savedDataSets.length === 0) {
                    return res.status(404).json({ success: false, message: "No Saved Projects" });
                }

                res.status(200).json({ success: true, data: savedDataSets.map(summarizeDataSetForList) });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
            break;
        case "POST":
            try {
                // Validate user_id or assume it's already validated and is being sent in correct format
                if (!mongoose.Types.ObjectId.isValid(user_id)) {
                    return res.status(400).json({ success: false, message: "Invalid user_id" });
                }
                const storageSummary = summarizeAdvancedDataStorage(data_sheets);
                if (storageSummary.requiresAdvancedStorage) {
                    const user = await User.findById(user_id).lean();
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
                const newDataSet = await DataSet.create({
                    data_set_name,
                    data,
                    data_sheets,
                    created_date: new Date(created_date),
                    last_saved_date: new Date(last_saved_date),
                    labels,
                    source,
                    save_revision: buildProjectRevision({ data_set_name, data_sheets, labels, source }),
                    save_meta: {
                        saveMode: "full",
                        savedAt: new Date().toISOString(),
                    },
                    user_id: new mongoose.Types.ObjectId(user_id)  // Convert user_id string to ObjectId
                });

                res.status(201).json({ success: true, data: newDataSet });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message }); // Include error message for debugging
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST']); // Specify allowed method
            res.status(405).end(`Method ${method} Not Allowed`); // Use 405 for method not allowed
    }
}
