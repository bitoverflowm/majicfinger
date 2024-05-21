import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId

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
                const savedCharts = await Chart.find({ user_id: uid })
                    .select('data_set_name created_date last_saved_date labels source user_id')
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
                // Validate user_id or assume it's already validated and is being sent in correct format
                if (!mongoose.Types.ObjectId.isValid(user_id)) {
                    return res.status(400).json({ success: false, message: "Invalid user_id" });
                }
                const newChart = await Chart.create({
                    chart_name,
                    chart_properties,
                    created_date: new Date(created_date),
                    last_saved_date: new Date(last_saved_date),
                    labels,
                    user_id: new mongoose.Types.ObjectId(user_id),  // Convert user_id string to ObjectId
                    data_set_id: new mongoose.Types.ObjectId(data_set_id)
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
