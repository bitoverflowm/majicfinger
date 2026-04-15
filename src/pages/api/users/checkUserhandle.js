// pages/api/users/checkUsername.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { isReservedUserHandle } from "@/lib/reservedUserHandles";

export default async function handler(req, res) {
    const { userHandle } = req.query;

    await dbConnect();

    try {
        if (isReservedUserHandle(String(userHandle || ""))) {
            return res.status(200).json({ exists: true, reserved: true });
        }
        const user = await User.findOne({ user_name: userHandle });
        if (user) {
            return res.status(200).json({ exists: true });
        }
        res.status(200).json({ exists: false });
    } catch (error) {
        res.status(400).json({ success: false });
    }
}
