import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";
import mongoose from 'mongoose'; // Ensure mongoose is imported for ObjectId
import { requirePaidMember } from "@/lib/requirePaidMember";

export default async function handler(req, res) {
    const {
        method,
        body: { project_name, project_data, created_date, last_edited_date, user_id }, // Destructure these from req.body
    } = req;

    await dbConnect();

    switch (method) {
        case "POST":
            try {
                const session = await requirePaidMember(req, res);
                if (!session) return;
                if (!mongoose.Types.ObjectId.isValid(user_id) || String(user_id) !== String(session.userId)) {
                    return res.status(403).json({ success: false, message: "Forbidden" });
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
