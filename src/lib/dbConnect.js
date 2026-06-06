//import { MongoClient } from 'mongodb'
import mongoose from "mongoose";
import {
  mongoDatabaseTarget,
  missingMongoUriMessage,
  resolveAppMongoUri,
  useProductionDatabase,
} from "@/lib/resolveMongoUri";

const MONGODB_URI = resolveAppMongoUri();

if (!MONGODB_URI) {
  throw new Error(missingMongoUriMessage());
}

if (useProductionDatabase() && process.env.NODE_ENV !== "production") {
  console.warn(
    "[db] USE_PRODUCTION_DB is on — connecting to production Mongo (MONGODB_URI).",
  );
} else {
  console.log(`[db] Using ${mongoDatabaseTarget()} Mongo.`);
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.uri && cached.uri !== MONGODB_URI) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    cached.conn = null;
    cached.promise = null;
  }
  cached.uri = MONGODB_URI;

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect