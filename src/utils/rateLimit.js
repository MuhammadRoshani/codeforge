import RateLimit from "@/models/RateLimit";

/**
 * Rate limiting is stored in MongoDB instead of Redis for this project.
 *
 * Redis would be a better choice for high-volume, distributed rate limiting
 * because of its in-memory performance. However, MongoDB was intentionally
 * chosen here to avoid adding another infrastructure dependency for a
 * relatively small project and because MongoDB is already part of the stack.
 *
 * For a production system with higher traffic or multiple application
 * instances, Redis would be a more suitable choice.
 */

/** 
 * Checks, consumes, or releases a rate-limit attempt.
 *
 * Supports three modes:
 *
 * 1. consume: false
 *    - Checks the current rate-limit state.
 *    - Does not create or modify a record.
 *
 * 2. consume: true
 *    - Consumes one attempt atomically.
 *    - Creates a new window when necessary.
 *    - Resets expired windows.
 *
 * 3. release: true
 *    - Releases one previously consumed attempt.
 *    - Never reduces the counter below zero.
 *    - Removes the record when no attempts remain.
 *
 * - The function can be reused for different rate-limit strategies,
 * including OTP requests, successful SMS messages, IP-based limits,
 * and authentication attempts.
 *
 * @param {Object} options
 * @param {string} options.key - Unique rate-limit key.
 * @param {number} options.limit - Maximum allowed attempts.
 * @param {number} options.windowMs - Rate-limit window in milliseconds.
 * @param {boolean} [options.consume=true] - Whether to consume an attempt.
 * @param {boolean} [options.release=false] - Whether to release an attempt.
 *
 * @returns {Promise<{
 *   allowed: boolean,
 *   remaining: number,
 *   retryAfter: number
 * }>}
 */

export async function rateLimit({
  key,
  limit,
  windowMs,
  consume = true,
  release = false,
}) {
  // Validate the rate-limit configuration.
  if (
    typeof key !== "string" ||
    !key.trim() ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    !Number.isFinite(windowMs) ||
    windowMs <= 0 ||
    typeof consume !== "boolean" ||
    typeof release !== "boolean"
  ) {
    throw new Error("Invalid rate limit configuration.");
  }

  // A rate-limit operation cannot consume and release at the same time.
  if (consume && release) {
    throw new Error("Rate limit cannot consume and release at the same time.");
  }

  const now = new Date();

  // Check the current rate-limit state without modifying the database.
  if (!consume && !release) {
    const record = await RateLimit.findOne({ key }).lean();

    // No record means that no attempts have been consumed.
    if (!record) {
      return {
        allowed: true,
        remaining: limit,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    // Treat an expired window as a fresh window.
    if (record.expiresAt <= now) {
      return {
        allowed: true,
        remaining: limit,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    const remaining = Math.max(limit - record.attempts, 0);

    return {
      allowed: remaining > 0,
      remaining,
      retryAfter: Math.max(
        Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000),
        0,
      ),
    };
  }

  // Release one previously consumed attempt.
  if (release) {
    const record = await RateLimit.findOne({
      key,
      expiresAt: { $gt: now },
      attempts: { $gt: 0 },
    }).lean();

    // Nothing needs to be released if the record does not exist
    // or the current rate-limit window has already expired.
    if (!record) {
      return {
        allowed: true,
        remaining: limit,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    // Atomically decrease the consumed attempt count.
    const releasedRecord = await RateLimit.findOneAndUpdate(
      {
        key,
        expiresAt: { $gt: now },
        attempts: { $gt: 0 },
      },
      {
        $inc: {
          attempts: -1,
        },
      },
      {
        returnDocument: "after",
      },
    ).lean();

    // Re-check the record if another concurrent operation changed it.
    if (!releasedRecord) {
      const currentRecord = await RateLimit.findOne({
        key,
      }).lean();

      if (!currentRecord || currentRecord.expiresAt <= now) {
        return {
          allowed: true,
          remaining: limit,
          retryAfter: Math.ceil(windowMs / 1000),
        };
      }

      const remaining = Math.max(limit - currentRecord.attempts, 0);

      return {
        allowed: remaining > 0,
        remaining,
        retryAfter: Math.max(
          Math.ceil((currentRecord.expiresAt.getTime() - now.getTime()) / 1000),
          0,
        ),
      };
    }

    // Remove the record when no attempts remain.
    if (releasedRecord.attempts <= 0) {
      await RateLimit.deleteOne({
        _id: releasedRecord._id,
        attempts: { $lte: 0 },
      });

      return {
        allowed: true,
        remaining: limit,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(limit - releasedRecord.attempts, 0),
      retryAfter: Math.max(
        Math.ceil((releasedRecord.expiresAt.getTime() - now.getTime()) / 1000),
        0,
      ),
    };
  }

  const expiresAt = new Date(now.getTime() + windowMs);

  // Atomically increment an active rate-limit record.
  // The attempts < limit condition prevents exceeding the limit.
  const updatedRecord = await RateLimit.findOneAndUpdate(
    {
      key,
      expiresAt: { $gt: now },
      attempts: { $lt: limit },
    },
    {
      $inc: {
        attempts: 1,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  // An existing active window was successfully incremented.
  if (updatedRecord) {
    return {
      allowed: true,
      remaining: Math.max(limit - updatedRecord.attempts, 0),
      retryAfter: Math.max(
        Math.ceil((updatedRecord.expiresAt.getTime() - now.getTime()) / 1000),
        0,
      ),
    };
  }

  // Check the current record to determine whether it is missing,
  // expired, or has already reached the configured limit.
  const existingRecord = await RateLimit.findOne({
    key,
  }).lean();

  // Create the first rate-limit window.
  if (!existingRecord) {
    try {
      const newRecord = await RateLimit.create({
        key,
        attempts: 1,
        windowStart: now,
        expiresAt,
      });

      return {
        allowed: true,
        remaining: Math.max(limit - newRecord.attempts, 0),
        retryAfter: Math.ceil(windowMs / 1000),
      };
    } catch (error) {
      // Another concurrent request may have created the same key.
      // MongoDB reports this as a duplicate-key error.
      if (error?.code !== 11000) {
        throw error;
      }

      // The record now exists, so continue and handle its current state.
    }
  }

  // Reset the rate-limit window when the existing window has expired.
  const resetRecord = await RateLimit.findOneAndUpdate(
    {
      key,
      expiresAt: { $lte: now },
    },
    {
      $set: {
        attempts: 1,
        windowStart: now,
        expiresAt,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (resetRecord) {
    return {
      allowed: true,
      remaining: Math.max(limit - resetRecord.attempts, 0),
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  // At this point the active window should have reached the limit.
  const currentRecord = await RateLimit.findOne({
    key,
  }).lean();

  if (!currentRecord) {
    throw new Error("Rate limit record could not be found.");
  }

  // Handle an unexpected state where the window expired
  // between the previous operations.
  if (currentRecord.expiresAt <= now) {
    return {
      allowed: true,
      remaining: limit,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  const remaining = Math.max(limit - currentRecord.attempts, 0);

  return {
    allowed: remaining > 0,
    remaining,
    retryAfter: Math.max(
      Math.ceil((currentRecord.expiresAt.getTime() - now.getTime()) / 1000),
      0,
    ),
  };
}
