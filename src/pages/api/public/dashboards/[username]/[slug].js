import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";
import User from "@/models/Users";

export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const user = await User.findOne({ user_name: String(username || "").trim() }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const bento = await Bento.findOne({
      user_id: user._id,
      public_slug: String(slug || "").trim(),
      is_public: true,
    }).lean();

    if (!bento) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        project_name: bento.project_name,
        project_data: bento.project_data,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
