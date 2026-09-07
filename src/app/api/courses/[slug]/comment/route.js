import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/auth";
import connectDB from "@/configs/db";
import Course from "@/models/Course";
import Comment from "@/models/Comment";

/**
 * Create a new comment for a course.
 *
 * - Requires the user to be authenticated.
 * - Finds the course using its slug.
 * - Validates the submitted comment text.
 * - Creates the comment with the authenticated user's ID.
 * - New comments are created as unapproved comments by default.
 * - The server never accepts moderation-related fields such as
 *   isApproved or isAdminReply from the client.
 *
 * The comment remains hidden from the public course page until
 * an administrator approves it.
 */

export async function POST(req, { params }) {
  try {
    // Verify the access token and retrieve the authenticated user's ID.
    const currentUser = getCurrentUser(req);

    if (!currentUser.success) {
      return currentUser;
    }

    await connectDB();

    const userId = currentUser.userId;

    // Extract the course slug from the dynamic route.
    const { slug } = await params;

    // Read the submitted comment from the request body.
    const { text } = await req.json();

    // Make sure the comment value is a string before using string methods.
    if (typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Comment text is required.",
        },
        { status: 400 },
      );
    }

    const trimmedText = text.trim();

    // Prevent empty comments from being submitted.
    if (!trimmedText) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment text cannot be empty.",
        },
        { status: 400 },
      );
    }

    // Keep API validation aligned with the Comment schema.
    if (trimmedText.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment must contain at least 10 characters.",
        },
        { status: 400 },
      );
    }

    if (trimmedText.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment cannot exceed 2000 characters.",
        },
        { status: 400 },
      );
    }

    // Find the course associated with the submitted comment.
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

    // Create the comment.
    //
    // isApproved is intentionally not provided here, so the schema
    // automatically sets it to false.
    //
    // isAdminReply is also not provided because this endpoint is for
    // regular user comments. Administrator replies should be handled
    // through a separate protected admin endpoint.
    const newComment = await Comment.create({
      user: userId,
      course: course._id,
      text: trimmedText,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Comment submitted successfully.",
        comment: newComment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Creating course comment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
