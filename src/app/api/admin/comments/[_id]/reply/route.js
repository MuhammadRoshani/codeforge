import { isAdmin } from "@/utils/auth";
import connectDB from "@/configs/db";
import Comment from "@/models/Comment";
import { NextResponse } from "next/server";

/**
 * Create an administrator reply for a course comment.
 *
 * - Requires administrator authentication.
 * - Finds the parent comment using its ID.
 * - Creates the reply as a separate Comment document.
 * - Uses the authenticated administrator's ID as the reply author.
 * - Automatically marks administrator replies as approved.
 * - Links the reply to the original comment through parentComment.
 * - Marks the created comment as an administrator reply.
 * - Returns the populated reply so the admin interface can display it
 *   immediately after a successful submission.
 *
 * Administrator identity and moderation-related fields are determined
 * by the server and are never trusted from the client request.
 */

export async function POST(req, { params }) {
  try {
    // Verify that the current user is an administrator.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    await connectDB();

    // Get the ID of the original comment from the dynamic route.
    const { _id } = await params;

    // Read the reply text submitted by the administrator.
    const { text } = await req.json();

    // Validate that the reply contains meaningful text.
    if (typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Reply text is required.",
        },
        { status: 400 },
      );
    }

    const trimmedText = text.trim();

    if (trimmedText.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Reply must contain at least 10 characters.",
        },
        { status: 400 },
      );
    }

    if (trimmedText.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Reply cannot exceed 2000 characters.",
        },
        { status: 400 },
      );
    }

    // Find the original comment that the administrator wants to reply to.
    const parentComment = await Comment.findById(_id);

    if (!parentComment) {
      return NextResponse.json(
        {
          success: false,
          message: "Parent comment not found.",
        },
        { status: 404 },
      );
    }

    /**
     * Create the administrator reply as a separate Comment document.
     *
     * The administrator ID comes from the verified access token rather than
     * from the client request. This prevents users from impersonating an
     * administrator or modifying moderation-related fields.
     *
     * Administrator replies are automatically approved because they are
     * created by an authenticated administrator.
     */
    const replyComment = await Comment.create({
      user: auth.adminId,
      course: parentComment.course,
      text: trimmedText,
      parentComment: parentComment._id,
      isApproved: true,
      isAdminReply: true,
    });

    /**
     * Populate the administrator information before returning the reply.
     *
     * The admin interface can use this populated data immediately without
     * making another request just to display the reply author's name.
     */
    const populatedReply = await Comment.findById(replyComment._id)
      .populate("user", "name")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Reply submitted successfully.",
        reply: populatedReply,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Creating admin reply error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
