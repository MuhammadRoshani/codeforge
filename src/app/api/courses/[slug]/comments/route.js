import connectDB from "@/configs/db";
import Course from "@/models/Course";
import { NextResponse } from "next/server";
import Comment from "@/models/Comment";

/**
 * Get approved comments for a specific course.
 *
 * - Finds the course using its slug.
 * - Retrieves only approved comments belonging to that course.
 * - Populates the comment author's basic information.
 * - Returns the newest comments first.
 * - Does not require authentication because approved comments are public.
 *
 * Unapproved comments are intentionally excluded from the response and
 * remain visible only through the future admin moderation system.
 */

export async function GET(req, { params }) {
  try {
    await connectDB();

    // Extract the course slug from the dynamic route.
    const { slug } = await params;

    // Find the course using its unique slug.
    const course = await Course.findOne({ slug }).select("_id");

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found.",
        },
        { status: 404 },
      );
    }

    // Retrieve only approved comments belonging to this course.
    const comments = await Comment.find({
      course: course._id,
      isApproved: true,
    })
      // Populate only the user information required by the frontend.
      .populate("user", "name")
      // Show the newest comments first.
      .sort({ createdAt: -1 })
      // Return plain JavaScript objects instead of Mongoose documents.
      .lean();

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("Getting course comments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
