import mongoose from "mongoose";

/**
 * Mongo URI for read-only public marketing content (published charts, hub assets).
 * In local dev, prefer production so hub pages match what ships on lycheedata.com.
 */
function getPublicReadUri() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return process.env.MONGODB_URI;
  }
  return process.env.MONGODB_URI || process.env.MONGODB_URI_DEV;
}

/** @type {{ conn: import("mongoose").Connection | null; promise: Promise<import("mongoose").Connection> | null }} */
let cached = { conn: null, promise: null };

export default async function dbConnectPublicRead() {
  const uri = getPublicReadUri();
  if (!uri) {
    throw new Error(
      "Please define MONGODB_URI (or MONGODB_URI_DEV) for public read queries",
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .createConnection(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      })
      .asPromise();
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/**
 * @param {import("mongoose").Connection} conn
 * @param {string} name
 * @param {import("mongoose").Model} defaultModel
 */
export function getPublicReadModel(conn, name, defaultModel) {
  if (conn.models[name]) return conn.models[name];
  return conn.model(name, defaultModel.schema);
}
