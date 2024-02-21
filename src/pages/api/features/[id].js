import dbConnect from "@/lib/dbConnect";
import Feature from "@/models/Features";

export default async function handler(req, res) {
    const {
        query: { id },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET": /* Get a model by its ID */
            try {
                const feature = await Feature.findById(id);
                if(!feature) {
                    return res.status(400).json({success: false});
                }
                res.status(200).json({success: true, data: feature});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        case "PUT": /* Edit a model by its ID */
            try {
                // Prepare the update object
                const update = {
                    $set: {
                    ...req.body,
                    },
                };
                const feature = await Feature.findByIdAndUpdate(id, update, {
                    new: true,
                    runValidators: true,
                    });
                if(!feature) {
                    return res.status(400).json({success: false});
                }
                res.status(200).json({success: true, data: feature});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        case "DELETE": /* Delete a model by its ID */
            try {
                const deleteFeature = await Feature.deleteOne({_id: id});
                if(!deleteFeature) {
                    return res.status(400).json({success: false});
                }
                res.status(200).json({success: true, data: {}});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        default:
            res.status(400).json({success: false});
            break;
    }
}