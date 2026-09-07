import { isAdmin } from "@/utils/auth";
import connectDB from "@/configs/db";
import Comment from "@/models/Comment";
import { NextResponse } from "next/server";

/**
 * Approve or reject a course comment.
 *
 * - Requires administrator authentication.
 * - Finds the comment using its ID.
 * - Updates the comment moderation status through isApproved.
 * - Allows administrators to both approve and reject comments.
 * - Populates the comment author's name before returning the updated comment.
 *
 * The moderation status is controlled only by an authenticated administrator.
 */

export async function PATCH(req, { params }) {
  try {
    // Verify that the current user is an administrator.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    await connectDB();

    // Get the comment ID from the dynamic route.
    const { _id } = await params;

    // Read the requested moderation status from the request body.
    const { isApproved } = await req.json();

    // Ensure that isApproved is explicitly a boolean value.
    if (typeof isApproved !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Approval status must be a boolean value.",
        },
        { status: 400 },
      );
    }

    /**
     * Update the comment moderation status.
     *
     * The new: true option returns the updated document so the admin
     * interface can immediately use the latest comment state.
     */
    const comment = await Comment.findByIdAndUpdate(
      _id,
      { isApproved },
      { new: true },
    ).populate("user", "name");

    // Return 404 when the requested comment does not exist.
    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Comment ${isApproved ? "approved" : "rejected"} successfully.`,
        comment,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Updating comment approval status error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
