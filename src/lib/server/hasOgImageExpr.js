/**
 * Aggregation expression for "has a stored OG image". `og_image_data` is a ~100KB data URL, so
 * listings compute the flag in MongoDB instead of downloading the string.
 */
export const HAS_OG_IMAGE_EXPR = {
  $cond: [
    { $eq: [{ $type: "$og_image_data" }, "string"] },
    { $gt: [{ $strLenBytes: "$og_image_data" }, 0] },
    false,
  ],
};
