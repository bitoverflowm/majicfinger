import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";
import { buildProjectRevision } from "@/lib/projectPersistence";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "16mb",
        },
    },
};

export default async function handler(req, res) {
    const {
        query: { id },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const dataSet = await DataSet.findById(id);
                if (!dataSet) {
                    return res.status(400).json({ success: false, message: `No dataSet found for id: ${id}` });
                }
                res.status(200).json({ success: true, data: dataSet });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                const nextRevision = buildProjectRevision({
                    data_set_name: req.body.data_set_name,
                    data_sheets: req.body.data_sheets,
                    labels: req.body.labels,
                    source: req.body.source,
                });
                // Prepare the update object
                const update = {
                    $set: {
                        data_set_name: req.body.data_set_name,
                        data: req.body.data,
                        data_sheets: req.body.data_sheets,
                        last_saved_date: new Date(),
                        labels: req.body.labels,
                        source: req.body.source,
                        save_revision: nextRevision,
                        save_meta: {
                            saveMode: "full",
                            savedAt: new Date().toISOString(),
                        },
                    },
                };
                const updatedDataSet = await DataSet.findByIdAndUpdate(id, update, {
                    new: true,
                    runValidators: true,
                });
                if (!updatedDataSet) {
                    return res.status(400).json({ success: false , message: "there was an issue in updating the data"});
                }
                res.status(200).json({ success: true, data: updatedDataSet });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
            break;
        case "PATCH":
            try {
                const existing = await DataSet.findById(id);
                if (!existing) {
                    return res.status(400).json({ success: false, message: `No dataSet found for id: ${id}` });
                }
                const body = req.body || {};
                const currentRevision = existing.save_revision || buildProjectRevision(existing);
                if (body.baseRevision && currentRevision && body.baseRevision !== currentRevision) {
                    return res.status(409).json({
                        success: false,
                        code: "REVISION_CONFLICT",
                        message: "This project changed since you loaded it. Reload the project before saving again.",
                        currentRevision,
                    });
                }

                const patch = body.patch && typeof body.patch === "object" ? body.patch : {};
                const existingSheets = existing.data_sheets && typeof existing.data_sheets === "object"
                    ? existing.data_sheets
                    : {};
                const nextSheets = { ...existingSheets };
                for (const sheetId of Array.isArray(patch.deletedSheetIds) ? patch.deletedSheetIds : []) {
                    delete nextSheets[sheetId];
                }
                const changedSheets = patch.changedSheets && typeof patch.changedSheets === "object" ? patch.changedSheets : {};
                for (const [sheetId, sheet] of Object.entries(changedSheets)) {
                    nextSheets[sheetId] = sheet;
                }
                const firstSheet = Object.values(nextSheets)[0];
                const nextData = Array.isArray(firstSheet?.data) ? firstSheet.data : [];
                const nextProject = {
                    data_set_name: patch.data_set_name ?? existing.data_set_name,
                    data_sheets: nextSheets,
                    labels: patch.labels ?? existing.labels,
                    source: patch.source ?? existing.source,
                };
                const nextRevision = buildProjectRevision(nextProject);
                existing.data_set_name = nextProject.data_set_name;
                existing.data = nextData;
                existing.data_sheets = nextSheets;
                existing.labels = nextProject.labels;
                existing.source = nextProject.source;
                existing.last_saved_date = new Date(patch.last_saved_date || Date.now());
                existing.save_revision = nextRevision;
                existing.save_meta = {
                    saveMode: "patch",
                    savedAt: new Date().toISOString(),
                    changedSheetCount: Object.keys(changedSheets).length,
                    deletedSheetCount: Array.isArray(patch.deletedSheetIds) ? patch.deletedSheetIds.length : 0,
                    baseRevision: body.baseRevision || currentRevision,
                };
                existing.markModified("data_sheets");
                existing.markModified("save_meta");
                const updatedDataSet = await existing.save();
                res.status(200).json({ success: true, data: updatedDataSet });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
            break;
        case "DELETE":
            try {
                const deletedDataSet = await DataSet.findByIdAndDelete(id);
                if (!deletedDataSet) {
                    return res.status(400).json({ success: false, message: `No DataSets found for id: ${id}` });
                }
                res.status(200).json({ success: true, message: `DataSet with id ${id} deleted successfully` });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        default:
            res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
            res.status(405).json({ success: false });
            break;
    }
}