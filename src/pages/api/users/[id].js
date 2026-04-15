import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { isReservedUserHandle, reservedUserHandleMessage } from "@/lib/reservedUserHandles";

export default async function handler(req, res) {
    const {
        query: { id },
        method,
    } = req;

    await dbConnect();

    switch (method) {
        case "GET": /* Get a model by its ID */
            try {
                const user = await User.findById(id);
                if(!user) {
                    return res.status(400).json({success: false});
                }
                res.status(200).json({success: true, data: user});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        case "PUT": /* Edit a model by its ID */
            try {
                if (req.body?.user_name !== undefined && isReservedUserHandle(String(req.body.user_name || ""))) {
                    return res.status(400).json({
                        success: false,
                        message: reservedUserHandleMessage(req.body.user_name),
                    });
                }
                // Prepare the update object
                const update = {
                    $set: {
                    ...req.body,
                    },
                };
                const user = await User.findByIdAndUpdate(id, update, {
                    new: true,
                    runValidators: true,
                    });
                if(!user) {
                    return res.status(400).json({success: false});
                }
                res.status(200).json({success: true, data: user});
            } catch (error) {
                res.status(400).json({success: false});
            }
            break;
        case "DELETE": /* Delete a model by its ID */
            try {
                const deleteUser = await User.deleteOne({_id: id});
                if(!deleteUser) {
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