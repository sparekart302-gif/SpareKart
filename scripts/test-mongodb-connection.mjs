#!/usr/bin/env node

import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "sparekart";

function isPlaceholderValue(value) {
  return Boolean(
    value &&
    (/cluster\.example/i.test(value) ||
      /username:password/i.test(value) ||
      /replace-with/i.test(value) ||
      /<[^>]+>/.test(value)),
  );
}

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to your local .env file first.");
  process.exit(1);
}

if (isPlaceholderValue(uri)) {
  console.error(
    "MONGODB_URI is still using a placeholder value. Replace it with a real Atlas connection string first.",
  );
  process.exit(1);
}

try {
  const connection = await mongoose.connect(uri, {
    dbName,
    autoIndex: false,
    bufferCommands: false,
  });

  await connection.connection.db?.admin().ping();

  console.log("MongoDB Atlas connection successful.");
  console.log(`Database: ${connection.connection.name}`);
  console.log(`Host: ${connection.connection.host}`);
  console.log(`Ready state: ${connection.connection.readyState}`);

  await mongoose.disconnect();
} catch (error) {
  console.error("MongoDB Atlas connection failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
