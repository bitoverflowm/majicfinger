import dbConnect from "@/lib/dbConnect";
import Presentation from "@/models/Presentations";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
        body: { project_name, presentation_name, display_map, data_meta, data_snap_shot, user_id }, // Destructure these from req.body
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const presentations = await Presentation.find({ user_id: uid })
                    .select('project_name presentation_name last_saved_date')
                    .exec();

                if (!presentations || presentations.length === 0) {
                    return res.status(404).json({ success: false, message: "No Presentations dound" });
                }

                res.status(200).json({ success: true, data: presentations });
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
                const newPresentation = await Presentation.create({
                    project_name,
                    presentation_name,
                    display_map,
                    data_meta,
                    data_snap_shot,
                    created_date: new Date(),
                    last_saved_date: new Date(),
                    user_id: new mongoose.Types.ObjectId(user_id)  // Convert user_id string to ObjectId
                });
                res.status(201).json({ success: true, data: newPresentation });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message }); // Include error message for debugging
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST']); // Specify allowed method
            res.status(405).end(`Method ${method} Not Allowed`); // Use 405 for method not allowed
    }
}
