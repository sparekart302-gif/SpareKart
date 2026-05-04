import "server-only";

import mongoose from "mongoose";
import { getServerEnv } from "@/server/config/env";
import { MongoApiError } from "./errors";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var sparekartMongoose: MongooseCache | undefined;
}

const globalCache = globalThis as typeof globalThis & {
  sparekartMongoose?: MongooseCache;
};

const cache = globalCache.sparekartMongoose ?? {
  conn: null,
  promise: null,
};

globalCache.sparekartMongoose = cache;

mongoose.set("strictQuery", true);

function getCachedReadyState() {
  return cache.conn?.connection.readyState ?? 0;
}

function clearMongoCache() {
  cache.conn = null;
  cache.promise = null;
}

export async function connectToMongo() {
  const env = getServerEnv();

  if (!env.mongodbConfigured || !env.MONGODB_URI) {
    throw new MongoApiError("MongoDB is not configured. Set MONGODB_URI first.", {
      status: 500,
      code: "MONGODB_NOT_CONFIGURED",
    });
  }

  const readyState = getCachedReadyState();

  if (cache.conn && readyState === 1) {
    return cache.conn;
  }

  if (cache.conn && readyState !== 2) {
    clearMongoCache();
  }

  if (cache.promise) {
    try {
      cache.conn = await cache.promise;
      return cache.conn;
    } catch (error) {
      clearMongoCache();
      throw error;
    }
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      autoIndex: env.NODE_ENV !== "production",
      bufferCommands: false,
      maxPoolSize: 15,
      minPoolSize: env.NODE_ENV === "production" ? 1 : 0,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
    });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    clearMongoCache();
    throw error;
  }
}

export async function pingMongo() {
  const connection = await connectToMongo();
  await connection.connection.db?.admin().ping();

  return {
    dbName: connection.connection.name,
    host: connection.connection.host,
    readyState: connection.connection.readyState,
  };
}
