import dbConnect from "@/lib/dbConnect";
import Presentation from "@/models/Presentations";
import { assertDocumentOwner, requireLoginSession } from "@/lib/resourceOwnership";
import { requirePaidMember } from "@/lib/requirePaidMember";

export default async function handler(req, res){
    const {
        query: {id},
        method,
    } = req;
    
    await dbConnect();

    switch (method) {
        case "GET":
            try {
                const session = await requireLoginSession(req, res);
                if (!session) return;
                const presentation = await Presentation.findById(id);
                if (!assertDocumentOwner(presentation, session, res)) return;
                res.status(200).json({ success: true, data: presentation });
            } catch (error) {
                res.status(400).json({ success: false });
            }
            break;
        case "PUT":
            try {
                const session = await requirePaidMember(req, res);
                if (!session) return;
                const owned = await Presentation.findById(id).select("user_id").lean();
                if (!assertDocumentOwner(owned, session, res)) return;
                const update = {
                    $set: {
                        project_name: req.body.project_name,
                        presentation_name: req.body.presentation_name,
                        template: req.body.template,
                        main_title: req.body.main_title,
                        sub_title: req.body.sub_title,
                        display_map: req.body.display_map,
                        data_meta: req.body.data_meta,
                        data_snap_shot: req.body.data_snap_shot,
                        palette: req.body.palette,
                        last_saved_date: new Date(),
                    },
                };
                const updatedPresentation = await Presentation.findOneAndUpdate({ _id: id, user_id: session.userId }, update, {
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
                const session = await requireLoginSession(req, res);
                if (!session) return;
                const deletedPresentation = await Presentation.findOneAndDelete({ _id: id, user_id: session.userId });
                if (!deletedPresentation) {
                    return res.status(404).json({ success: false, message: "Not found" });
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
