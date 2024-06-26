import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
        body: { data_set_name, data, created_date, last_saved_date, labels, source, user_id }, // Destructure these from req.body
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const savedDataSets = await DataSet.find({ user_id: uid })
                    .select('data_set_name created_date last_saved_date labels source user_id')
                    .exec();

                if (!savedDataSets || savedDataSets.length === 0) {
                    return res.status(404).json({ success: false, message: "No Saved Projects" });
                }

                res.status(200).json({ success: true, data: savedDataSets });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "POST":
            try {
                // Validate user_id or assume it's already validated and is being sent in correct format
                if (!mongoose.Types.ObjectId.isValid(user_id)) {
                    return res.status(400).json({ success: false, message: "Invalid user_id" });
                }
                const newDataSet = await DataSet.create({
                    data_set_name,
                    data,
                    created_date: new Date(created_date),
                    last_saved_date: new Date(last_saved_date),
                    labels,
                    source,
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
