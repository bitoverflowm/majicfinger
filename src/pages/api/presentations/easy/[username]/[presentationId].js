import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import Presentation from "@/models/Presentations";


export default async function handler(req, res) {
    console.log("we are in")
    await dbConnect();

    const { username, presentationId } = req.query;

    if (req.method === 'GET') {
        try {
            // Step 1: Check if the user exists
            const user = await User.findOne({ user_name: username });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Step 2: Fetch the presentation data
            const presentation = await Presentation.findOne({ _id: presentationId, user_id: user._id });
            if (!presentation) {
                return res.status(404).json({ error: "Presentation not found" });
            }

            res.status(200).json(presentation);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}