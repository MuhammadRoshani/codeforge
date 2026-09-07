import { isAdmin } from "@/utils/auth";
import connectDB from "@/configs/db";
import Comment from "@/models/Comment";
import User from "@/models/User";
import Course from "@/models/Course";
import { NextResponse } from "next/server";

/**
 * Get comments for the admin comments management page.
 *
 * - Requires administrator authentication.
 * - Supports server-side searching by comment text, user name, or course title.
 * - Supports filtering comments by approval status.
 * - Supports pagination for both normal and filtered results.
 * - Populates the user and course information required by the admin panel.
 * - Returns moderation-related fields such as isApproved, parentComment,
 *   and isAdminReply.
 * - Returns pagination metadata based on the filtered result set.
 */

export async function GET(req) {
  try {
    // Verify administrator access before connecting to the database.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);

    // Read and validate the requested page number.
    const requestedPage = Number(searchParams.get("page")) || 1;

    const page = Math.max(1, Math.floor(requestedPage));

    // Read the optional search and status filter parameters.
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "all";

    // Number of comments displayed on each admin page.
    const limit = 5;

    // Calculate how many documents should be skipped.
    const skip = (page - 1) * limit;

    // Validate the requested comment status.
    if (!["all", "approved", "pending"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid comment status.",
        },
        { status: 400 },
      );
    }

    /**
     * Build the base comment filter.
     *
     * The status filter is applied directly to the Comment collection.
     * Approved comments have isApproved = true, while pending comments
     * have isApproved = false.
     */
    const filter = {};

    if (status === "approved") {
      filter.isApproved = true;
    }

    if (status === "pending") {
      filter.isApproved = false;
    }

    /**
     * Search comments by their own text, user name, or course title.
     *
     * User names and course titles are stored in separate collections,
     * so matching user and course IDs are retrieved first and then
     * included in the comment query.
     */
    if (search) {
      // Escape regular expression characters so the search input is treated as plain text.
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      // Find users whose names match the search term.
      const matchingUsers = await User.find({
        name: searchRegex,
      })
        .select("_id")
        .lean();

      // Find courses whose titles match the search term.
      const matchingCourses = await Course.find({
        title: searchRegex,
      })
        .select("_id")
        .lean();

      const userIds = matchingUsers.map((user) => user._id);
      const courseIds = matchingCourses.map((course) => course._id);

      // Search in comment text, matching users, or matching courses.
      filter.$or = [
        { text: searchRegex },
        { user: { $in: userIds } },
        { course: { $in: courseIds } },
      ];
    }

    // Retrieve comments using the final status and search filters.
    const comments = await Comment.find(filter)
      .populate("user", "name phone avatar")
      .populate("course", "title slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Count only comments that match the current search and status filters.
    const total = await Comment.countDocuments(filter);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        success: true,
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Getting admin comments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
