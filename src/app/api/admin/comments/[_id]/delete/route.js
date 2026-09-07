import { isAdmin } from "@/utils/auth";
import connectDB from "@/configs/db";
import Comment from "@/models/Comment";
import { NextResponse } from "next/server";

/**
 * Delete a course comment from the admin panel.
 *
 * - Requires administrator authentication.
 * - Finds the requested comment using its ID.
 * - Deletes the comment from the database.
 * - Deletes administrator replies associated with the deleted comment.
 * - Returns a not-found response when the requested comment does not exist.
 *
 * Administrator identity is verified through the access token and is not
 * provided by the client request.
 */

export async function DELETE(req, { params }) {
  try {
    // Verify that the current user is an administrator.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    await connectDB();

    // Get the comment ID from the dynamic route.
    const { _id } = await params;

    /**
     * Find the comment before deleting it.
     *
     * The document is needed to determine whether this is a main user
     * comment and whether related administrator replies should also be
     * removed.
     */
    const comment = await Comment.findById(_id);

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found.",
        },
        { status: 404 },
      );
    }

    /**
     * Delete the selected comment.
     *
     * If this is a main user comment, its administrator replies are
     * also removed so that no orphaned replies remain in the database.
     */
    if (!comment.parentComment) {
      await Comment.deleteMany({
        parentComment: comment._id,
      });
    }

    await Comment.findByIdAndDelete(comment._id);

    return NextResponse.json(
      {
        success: true,
        message: "Comment deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Deleting admin comment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
