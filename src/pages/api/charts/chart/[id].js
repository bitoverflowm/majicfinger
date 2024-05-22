import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";

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
                // Prepare the update object
                const update = {
                    $set: {
                        chart_name: req.body.chart_name,
                        chart_properties: req.body.chart_properties,
                        last_saved_date: new Date(),
                        labels: req.body.labels,
                    },
                };
                const updatedChart = await Chart.findByIdAndUpdate(id, update, {
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