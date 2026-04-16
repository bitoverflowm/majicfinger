import mongoose from "mongoose";
import DataSet from "@/models/DataSets";
import Chart from "@/models/Charts";
import Presentation from "@/models/Presentations";

function asObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function normalizePresentationName(p) {
  return p?.presentation_name || p?.project_name || "Untitled presentation";
}

export async function analyzeAssetDependencies({ type, id, userId }) {
  const oid = asObjectId(id);
  const userOid = asObjectId(userId);
  if (!oid || !userOid) {
    return { ok: false, status: 400, message: "Invalid id" };
  }

  const uses = [];
  let asset = null;

  if (type === "dataset") {
    asset = await DataSet.findOne({ _id: oid, user_id: userOid }).select("_id data_set_name").lean();
    if (!asset) return { ok: false, status: 404, message: "Data sheet not found" };

    const charts = await Chart.find({ user_id: userOid, data_set_id: oid })
      .select("_id chart_name public_slug is_public")
      .lean();
    charts.forEach((c) => {
      uses.push({
        kind: "chart",
        id: String(c._id),
        name: c.chart_name || "Untitled chart",
      });
      if (c?.is_public && c?.public_slug) {
        uses.push({
          kind: "publicPage",
          id: String(c._id),
          name: c.chart_name || "Untitled chart",
          slug: c.public_slug,
        });
      }
    });

    const presentationQuery = {
      user_id: userOid,
      $or: [
        { "data_meta._id": String(oid) },
        { "data_meta._id": oid },
        { "data_meta.id": String(oid) },
        { "data_meta.id": oid },
        { "data_meta.data_set_id": String(oid) },
        { "data_meta.data_set_id": oid },
      ],
    };
    const presentations = await Presentation.find(presentationQuery)
      .select("_id presentation_name project_name")
      .lean();
    presentations.forEach((p) => {
      uses.push({
        kind: "presentation",
        id: String(p._id),
        name: normalizePresentationName(p),
      });
    });
  } else if (type === "chart") {
    asset = await Chart.findOne({ _id: oid, user_id: userOid })
      .select("_id chart_name public_slug is_public")
      .lean();
    if (!asset) return { ok: false, status: 404, message: "Chart not found" };

    if (asset?.is_public && asset?.public_slug) {
      uses.push({
        kind: "publicPage",
        id: String(asset._id),
        name: asset.chart_name || "Untitled chart",
        slug: asset.public_slug,
      });
    }
  } else if (type === "presentation") {
    asset = await Presentation.findOne({ _id: oid, user_id: userOid })
      .select("_id presentation_name project_name")
      .lean();
    if (!asset) return { ok: false, status: 404, message: "Presentation not found" };
  } else if (type === "publicPage") {
    asset = await Chart.findOne({ _id: oid, user_id: userOid })
      .select("_id chart_name public_slug is_public")
      .lean();
    if (!asset) return { ok: false, status: 404, message: "Public page not found" };
    if (asset?.is_public && asset?.public_slug) {
      uses.push({
        kind: "publicPage",
        id: String(asset._id),
        name: asset.chart_name || "Untitled chart",
        slug: asset.public_slug,
      });
    }
  } else {
    return { ok: false, status: 400, message: "Invalid type" };
  }

  return {
    ok: true,
    status: 200,
    data: {
      asset: {
        id: String(asset._id),
        type,
        name:
          type === "dataset"
            ? asset.data_set_name || "Untitled data sheet"
            : type === "presentation"
              ? normalizePresentationName(asset)
              : asset.chart_name || "Untitled chart",
      },
      uses,
    },
  };
}

export async function deleteAssetWithDependencies({ type, id, userId, deleteDownstream = false }) {
  const deps = await analyzeAssetDependencies({ type, id, userId });
  if (!deps.ok) return deps;

  const oid = asObjectId(id);
  const userOid = asObjectId(userId);
  const deleted = { datasets: 0, charts: 0, presentations: 0, publicPages: 0 };

  if (type === "publicPage") {
    const updated = await Chart.findOneAndUpdate(
      { _id: oid, user_id: userOid },
      { $set: { is_public: false }, $unset: { public_slug: "", og_image_url: "", og_image_data: "", og_image_updated_at: "" } },
      { new: true },
    ).lean();
    if (!updated) return { ok: false, status: 404, message: "Public page not found" };
    deleted.publicPages = 1;
    return { ok: true, status: 200, data: { deleted, uses: deps.data.uses } };
  }

  if (type === "dataset") {
    const chartDocs = await Chart.find({ user_id: userOid, data_set_id: oid }).select("_id is_public public_slug").lean();
    const chartIds = chartDocs.map((c) => c._id);
    const presentationQuery = {
      user_id: userOid,
      $or: [
        { "data_meta._id": String(oid) },
        { "data_meta._id": oid },
        { "data_meta.id": String(oid) },
        { "data_meta.id": oid },
        { "data_meta.data_set_id": String(oid) },
        { "data_meta.data_set_id": oid },
      ],
    };
    const presentationDocs = await Presentation.find(presentationQuery).select("_id").lean();
    const presentationIds = presentationDocs.map((p) => p._id);

    await DataSet.deleteOne({ _id: oid, user_id: userOid });
    deleted.datasets = 1;

    if (deleteDownstream) {
      if (chartIds.length) {
        const result = await Chart.deleteMany({ _id: { $in: chartIds }, user_id: userOid });
        deleted.charts = result.deletedCount || 0;
      }
      if (presentationIds.length) {
        const result = await Presentation.deleteMany({ _id: { $in: presentationIds }, user_id: userOid });
        deleted.presentations = result.deletedCount || 0;
      }
      deleted.publicPages = chartDocs.filter((c) => c?.is_public && c?.public_slug).length;
    }
    return { ok: true, status: 200, data: { deleted, uses: deps.data.uses } };
  }

  if (type === "chart") {
    const chart = await Chart.findOneAndDelete({ _id: oid, user_id: userOid }).select("is_public public_slug").lean();
    if (!chart) return { ok: false, status: 404, message: "Chart not found" };
    deleted.charts = 1;
    if (chart?.is_public && chart?.public_slug) deleted.publicPages = 1;
    return { ok: true, status: 200, data: { deleted, uses: deps.data.uses } };
  }

  if (type === "presentation") {
    const pres = await Presentation.findOneAndDelete({ _id: oid, user_id: userOid }).lean();
    if (!pres) return { ok: false, status: 404, message: "Presentation not found" };
    deleted.presentations = 1;
    return { ok: true, status: 200, data: { deleted, uses: deps.data.uses } };
  }

  return { ok: false, status: 400, message: "Invalid type" };
}
