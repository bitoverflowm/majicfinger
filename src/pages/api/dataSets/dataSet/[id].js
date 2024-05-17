import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";

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
                // Prepare the update object
                const update = {
                    $set: {
                    ...req.body,
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
                res.status(400).json({ success: false});
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
            res.status(400).json({ success: false });
            break;
    }
}