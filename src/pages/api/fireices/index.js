import dbConnect from "@/lib/dbConnect";
import FireIce from "@/models/FireIce";

export default async function handler(req, res) {
    const {method} = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try{
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.itemsPerPage) || 20;

                const startIndex = (page - 1) * limit;

                const fireIces = await FireIce.find({}).skip(startIndex).limit(limit); /* Find all Fire and Ice db entries */
                res.status(200).json({success: true, data: fireIces});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        case "POST":
            try{
                const fireIce = await FireIce.create(req.body); /* Create a new Fire and Ice db entry */
                res.status(201).json({success: true, data: fireIce});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        default:
            res.status(400).json({success: false});
            break;
    }
}