import dbConnect from "@/lib/dbConnect";
import Publication from "@/models/Publications";
import User from "@/models/Users";

export default async function handler(req, res) {
    const {
        query: { username, projectName, presentationName },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                console.log("hello")
                // Check if the user with the given username exists
                const user = await User.findOne({ user_name: username });

                console.log("we are in and here is user: ", user)
                
                if (!user) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }

                // Fetch the publication data for the user
                const publication = await Publication.findOne({
                    project_name: projectName,
                    presentation_name: presentationName,
                    user_id: user._id,
                });

                if (!publication) {
                    return res.status(404).json({ success: false, message: "Publication not found" });
                }

                res.status(200).json({ success: true, data: publication });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
            break;
        default:
            res.setHeader('Allow', ['GET']); // Specify allowed method
            res.status(405).end(`Method ${method} Not Allowed`); // Use 405 for method not allowed
    }
}
