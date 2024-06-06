import dbConnect from "@/lib/dbConnect";
import Presentation from "@/models/Presentations";

export default async function handler(req, res){
    const {
        query: {id},
        method,
    } = req;
    
    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const presentation = await Presentation.findById(id);
                if (!presentation) {
                    return res.status(400).json({ success: false, message: `No presentation found for id: ${id}` });
                }
                res.status(200).json({ success: true, data: presentation });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                // Prepare the update object
                const update = {
                    $set: {
                        presentation_name: req.body.presentation_name,
                        display_map: req.body.display_map,
                        data_meta: req.body.data_meta,
                        data_snap_shot: req.body.data_snap_shot,
                        last_saved_date: new Date(),
                    },
                };
                const updatedPresentation = await Presentation.findByIdAndUpdate(id, update, {
                    new: true,
                    runValidators: true,
                });
                if (!updatedPresentation) {
                    return res.status(400).json({ success: false , message: "there was an issue in updating the presentation"});
                }
                res.status(200).json({ success: true, data: updatedPresentation });
            } catch (error) {
                res.status(400).json({ success: false});
            }
            break;
        case "DELETE":
            try {
                const deletedPresentation = await Presentation.findByIdAndDelete(id);
                if (!deletedPresentation) {
                    return res.status(400).json({ success: false, message: `No Presentation found for id: ${id}` });
                }
                res.status(200).json({ success: true, message: `Presentation with id ${id} deleted successfully` });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        default:
            res.status(400).json({ success: false });
            break;
    }
}