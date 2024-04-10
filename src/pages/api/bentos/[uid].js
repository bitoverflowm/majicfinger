import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const savedBentos = await Bento.find({user_id: uid})
                                                .select('project_name created_date last_edited_date user_id') 
                                                .exec();

                if (!savedBentos) {
                    return res.status(400).json({ success: false, message: "No bentos found" });
                }                

                res.status(200).json({ success: true, data: savedBentos });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
    }
}