import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId

export default async function handler(req, res) {
    const {
        method,
        body: { project_name, project_data, created_date, last_edited_date, user_id }, // Destructure these from req.body
    } = req;

    await dbConnect();

    switch (method) {
        case "POST":
            try {
                // Validate user_id or assume it's already validated and is being sent in correct format
                if (!mongoose.Types.ObjectId.isValid(user_id)) {
                    return res.status(400).json({ success: false, message: "Invalid user_id" });
                }

                const newBento = await Bento.create({
                    project_name,
                    project_data,
                    created_date: new Date(created_date),
                    last_edited_date: new Date(last_edited_date),
                    user_id: new mongoose.Types.ObjectId(user_id)  // Convert user_id string to ObjectId
                });

                res.status(201).json({ success: true, data: newBento });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message }); // Include error message for debugging
            }
            break;

        default:
            res.setHeader('Allow', ['POST']); // Specify allowed method
            res.status(405).end(`Method ${method} Not Allowed`); // Use 405 for method not allowed
    }
}
