import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";

export default async function handler(req, res) {
    const {
        query: { uid },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const savedDataSets = await DataSet.find({user_id: uid})
                                                .select('data_set_name created_date last_saved_date labels source user_id') 
                                                .exec();

                if (!savedDataSets) {
                    return res.status(400).json({ success: false, message: "No Saved Projects" });
                }                

                res.status(200).json({ success: true, data: savedDataSets });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
    }
}