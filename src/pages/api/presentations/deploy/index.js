// pages/api/deploy.js
import dbConnect from "@/lib/dbConnect";
import Presentation from "@/models/Presentations";
import Publication from "@/models/Publications";

export default async function handler(req, res) {
    const { presentationId } = req.body;
    
    await dbConnect();

    try {
        const presentation = await Presentation.findById(presentationId);

        if (!presentation) {
            return res.status(404).json({ success: false, message: "Presentation not found" });
        }

        let publication;
        if (presentation.publication_id) {
            // Update existing publication
            publication = await Publication.findByIdAndUpdate(
                presentation.publication_id,
                {
                    $set: {
                        project_name: presentation.project_name,
                        presentation_name: presentation.presentation_name,
                        template: presentation.template,
                        main_title: presentation.main_title,
                        sub_title: presentation.sub_title,
                        display_map: presentation.display_map,
                        data_meta: presentation.data_meta,
                        data_snap_shot: presentation.data_snap_shot,
                        palette: presentation.palette,
                        deployed_date: new Date(),
                        presentation_id: presentation._id,
                        user_id: presentation.user_id,
                    },
                },
                { new: true, runValidators: true }
            );
        } else {
            // Create new publication
            publication = await Publication.create({
                project_name: presentation.project_name,
                presentation_name: presentation.presentation_name,
                template: presentation.template,
                main_title: presentation.main_title,
                sub_title: presentation.sub_title,
                display_map: presentation.display_map,
                data_meta: presentation.data_meta,
                data_snap_shot: presentation.data_snap_shot,
                palette: presentation.palette,
                created_date: new Date(),
                deployed_date: new Date(),
                presentation_id: presentation._id,
                user_id: presentation.user_id,
            });
        }
        // Update the presentation with the new publication_id
        await Presentation.findByIdAndUpdate(
            presentationId,
            { 
                publication_id: publication._id,
                last_deployed_date: new Date(),
            },
            { new: true, runValidators: true }
        );

        presentation.last_deployed_date = new Date();
        await presentation.save();

        res.status(201).json({ success: true, data: publication });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}
