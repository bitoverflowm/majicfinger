import dbConnect from "@/lib/dbConnect";
import Feature from "@/models/Features";

export default async function handler(req, res) {
    const {method} = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const features = await Feature.find({
                    /* find all the data in our database */
                });
                res.status(200).json({success: true, data: features});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        case "POST":
            try {
                const feature = await Feature.create(
                    /* create a new model in the database */
                    req.body
                );
                res.status(201).json({success: true, data: feature});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        default:
            res.status(400).json({success: false});
            break;
    }
}