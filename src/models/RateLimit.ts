import mongoose, { type HydratedDocument, type Model } from "mongoose";

/**
 * Stores rate-limit state for API requests.
 *
 * - Each record represents one rate-limit key, such as a phone number
 * or client IP address, and keeps track of the number of attempts
 * within the current time window.
 * - The expiresAt field uses MongoDB's TTL index so expired rate-limit
 * records are automatically removed from the database.
 * - The rateLimit utility handles checking, consuming, and releasing
 * attempts while this model is responsible only for storing the
 * rate-limit state.
 */

// Defines the TypeScript structure of a rate-limit document.
interface RateLimit {
  key: string;
  attempts: number;
  windowStart: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type RateLimitDocument = HydratedDocument<RateLimit>;
type RateLimitModel = Model<RateLimit>;

const rateLimitSchema = new mongoose.Schema<RateLimit, RateLimitModel>(
  {
    // Unique identifier for the rate-limit record.
    // Examples: phone number or IP address.
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Number of requests made during the current rate-limit window.
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Start time of the current rate-limit window.
    windowStart: {
      type: Date,
      required: true,
    },

    // Time when the current rate-limit window expires.
    // MongoDB automatically deletes the document after this time.
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expireAfterSeconds: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

const RateLimit =
  (mongoose.models.RateLimit as RateLimitModel | undefined) ||
  mongoose.model<RateLimit, RateLimitModel>("RateLimit", rateLimitSchema);

export type { RateLimit, RateLimitDocument };

export default RateLimit;
