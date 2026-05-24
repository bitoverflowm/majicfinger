import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId
import { assertQueryUserMatchesSession, requireLoginSession } from "@/lib/resourceOwnership";

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
        body: { chart_name, chart_properties, created_date, last_saved_date, labels, user_id, data_set_id }, // Destructure these from req.body
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const session = await requireLoginSession(req, res);
                if (!session) return;
                if (!assertQueryUserMatchesSession(uid, session, res)) return;
                const savedCharts = await Chart.find({ user_id: session.userId })
                    .select('chart_name last_saved_date labels user_id data_set_id public_slug is_public')
                    .exec();

                if (!savedCharts || savedCharts.length === 0) {
                    return res.status(404).json({ success: false, message: "No Charts Found" });
                }

                res.status(200).json({ success: true, data: savedCharts });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "POST":
            try {
                const session = await requireLoginSession(req, res);
                if (!session) return;
                if (!mongoose.Types.ObjectId.isValid(data_set_id)) {
                    return res.status(400).json({ success: false, message: "Invalid data_set_id" });
                }
                const project = await DataSet.findById(data_set_id).select("user_id").lean();
                if (!project || String(project.user_id) !== String(session.userId)) {
                    return res.status(404).json({ success: false, message: "Project not found" });
                }
                const ownerId = new mongoose.Types.ObjectId(String(session.userId));
                const newChart = await Chart.create({
                    chart_name,
                    chart_properties,
                    created_date: new Date(created_date),
                    last_saved_date: new Date(last_saved_date),
                    labels,
                    user_id: ownerId,
                    data_set_id: new mongoose.Types.ObjectId(data_set_id),
                });

                res.status(201).json({ success: true, data: newChart });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message }); // Include error message for debugging
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST']); // Specify allowed method
            res.status(405).end(`Method ${method} Not Allowed`); // Use 405 for method not allowed
    }
}
