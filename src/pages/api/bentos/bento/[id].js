import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";

export default async function handler(req, res) {
    const {
        query: { id },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const bento = await Bento.findById(id);
                if (!bento) {
                    return res.status(400).json({ success: false, message: `No bentos found for id: ${id}` });
                }
                res.status(200).json({ success: true, data: bento });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                // Prepare the update object
                const update = {
                    $set: {
                    ...req.body,
                    },
                };
                const updatedBento = await Bento.findByIdAndUpdate(id, update, {
                    new: true,
                    runValidators: true,
                });
                if (!updatedBento) {
                    return res.status(400).json({ success: false , message: "there was an issue in updating the bento"});
                }
                res.status(200).json({ success: true, data: updatedBento });
            } catch (error) {
                res.status(400).json({ success: false});
            }
            break;
        case "DELETE":
            try {
                const deletedBento = await Bento.findByIdAndDelete(id);
                if (!deletedBento) {
                    return res.status(400).json({ success: false, message: `No bentos found for id: ${id}` });
                }
                res.status(200).json({ success: true, message: `Bento with id ${id} deleted successfully` });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        default:
            res.status(400).json({ success: false });
            break;
    }
}