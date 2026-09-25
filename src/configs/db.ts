import mongoose from "mongoose";

/**
 * Database connection.
 *
 * - Establishes a connection to MongoDB and reuses the existing
 * connection to avoid creating multiple connections.
 */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI)
  throw new Error("MONGO_URI is not defined in the environment variables.");

const mongoUri: string = MONGO_URI;

export default async function connectDB(): Promise<void> {
  try {
    // Skip reconnecting if the database is already connected.
    if (mongoose.connection.readyState) return;

    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

// Using `mongoose.connection` instead of `mongoose.connections[0]`,
// because this project uses only a single MongoDB connection.