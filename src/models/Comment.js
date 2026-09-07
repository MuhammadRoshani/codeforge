import mongoose from "mongoose";

/**
 * Comment Schema.
 *
 * - Stores comments submitted by users for courses.
 * - Supports admin moderation through the isApproved field.
 * - Supports nested replies through parentComment.
 * - Allows administrators to respond to user comments.
 * - Uses timestamps to automatically store creation and update dates.
 * - Includes indexes for common course comment queries.
 */

const commentSchema = new mongoose.Schema(
  {
    /**
     * User who submitted the comment.
     *
     * References the User model so the comment can be populated
     * with the user's profile information when required.
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    //   Course associated with the comment.
    //   Each comment belongs to a specific course.
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    /**
     * Comment content.
     *
     * The text is trimmed before being stored and limited in length
     * to prevent unnecessarily large comment documents.
     */
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxLength: 2000,
    },

    /**
     * Determines whether the comment has been approved by an administrator.
     *
     * New comments remain hidden from the public course page until
     * they are explicitly approved.
     */
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * Parent comment for replies.
     *
     * A null value means this is a top-level comment.
     * When this field contains another comment's ID, the current
     * comment is treated as a reply to that comment.
     */
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    /**
     * Determines whether the comment was created as an administrator reply.
     *
     * This allows the frontend and admin panel to visually distinguish
     * administrator responses from regular user comments.
     */
    isAdminReply: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Optimizes the most common public comment query:
 *
 * Find approved comments belonging to a specific course and sort them
 * by creation date.
 */
commentSchema.index({
  course: 1,
  isApproved: 1,
  createdAt: -1,
});

//   Prevents Mongoose from recompiling the model during Next.js development
//   hot reloads.

export default mongoose.models.Comment ||
  mongoose.model("Comment", commentSchema);
