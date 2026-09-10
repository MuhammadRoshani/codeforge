import connectDB from "@/configs/db";
import Course from "@/models/Course";
import { NextResponse } from "next/server";

/**
 * Returns the latest published courses for the home page.
 *
 * Features:
 * - Fetches only published courses.
 * - Sorts courses from newest to oldest using `createdAt`.
 * - Supports an optional `limit` query parameter.
 * - Defaults to 4 courses when no valid limit is provided.
 * - Limits the maximum number of returned courses to 20.
 * - Selects only the fields required by the home page.
 * - Uses `lean()` because the returned documents are only used as
 *   plain response data and do not require Mongoose document methods.
 *
 * Example:
 * GET /api/courses/latest
 * GET /api/courses/latest?limit=6
 */

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Parses the optional `limit` parameter as an integer.
    const requestedLimit = parseInt(searchParams.get("limit"), 10);

    /**
     * Determines the number of courses to return.
     *
     * - Uses the requested limit when it is a positive number.
     * - Defaults to 4 when the parameter is missing or invalid.
     * - Caps the maximum value at 20 to prevent unnecessarily large queries.
     */
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 20)
        : 4;

    /**
     * Fetches the latest published courses.
     *
     * Only the fields required to render the course cards on the home page
     * are selected instead of returning the complete Course documents.
     */
    const courses = await Course.find({ status: "published" })
      .populate("teacher", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "title slug shortDescription thumbnail price discountPrice isFree level teacher studentsCount",
      )
      .lean();

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Error fetching latest courses:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch latest courses.",
      },
      { status: 500 },
    );
  }
}
