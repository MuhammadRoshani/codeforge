import { NextResponse } from "next/server";
import connectDB from "@/configs/db";
import Comment from "@/models/Comment";
import { isAdmin } from "@/utils/auth";

/**
 * Update Administrator Reply API Route
 *
 * This API route allows authenticated administrators to edit an existing
 * administrator reply that belongs to a course comment.
 *
 * Responsibilities:
 * - Verify that the requester has administrator privileges.
 * - Validate the administrator reply text.
 * - Find the requested comment by its MongoDB document ID.
 * - Ensure that the selected comment is actually an administrator reply.
 * - Update the reply text and save the changes to the database.
 * - Return an appropriate response for successful and failed requests.
 */

export async function PATCH(req, { params }) {
  try {
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    await connectDB();

    const { _id } = await params;
    const body = await req.json();

    const text = body.text?.trim();

    // Make sure the reply contains valid text.
    if (!text) {
      return NextResponse.json(
        {
          success: false,
          message: "Reply text is required.",
        },
        { status: 400 },
      );
    }

    // Enforce the minimum allowed reply length.
    if (text.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Reply must contain at least 10 characters.",
        },
        { status: 400 },
      );
    }

    // Enforce the maximum allowed reply length.
    if (text.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Reply cannot exceed 2000 characters.",
        },
        { status: 400 },
      );
    }

    // Find the comment that is going to be edited.
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

    // Prevent this endpoint from modifying regular user comments.
    if (!comment.isAdminReply) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admin replies can be edited.",
        },
        { status: 403 },
      );
    }

    // Update the existing administrator reply with the new text.
    comment.text = text;

    await comment.save();

    return NextResponse.json({
      success: true,
      message: "Reply updated successfully.",
      comment,
    });
  } catch (error) {
    console.error("Updating admin reply error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating the reply.",
      },
      { status: 500 },
    );
  }
}
