"use client";

import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import Link from "next/link";

import styles from "./CourseComments.module.css";

/**
 * Course Comments Component.
 *
 * - Displays approved comments received from the Course Details Server Component.
 * - Allows authenticated users to submit a new comment for the current course.
 * - Uses the centralized Axios client for authenticated API requests.
 * - Unauthenticated users are redirected to the authentication page when
 *   attempting to write a review.
 * - New comments are submitted to the course-specific comment API and remain
 *   hidden until they are approved by an administrator.
 * - Supports administrator replies through the Comment model's parentComment
 *   relationship.
 * - Groups administrator replies under their corresponding parent comments.
 * - Displays only approved comments because the server provides only approved
 *   comments to the public course page.
 */

export default function CourseComments({ course, comments = [] }) {
  const { user } = useAuth();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

  /**
   * Opens the comment modal.
   *
   * Only authenticated users are allowed to submit comments.
   * Unauthenticated users are redirected to the authentication page.
   */
  const openModal = () => {
    if (!user) {
      router.push("/auth");
      return;
    }

    setIsModalOpen(true);

    setMessage({
      text: "",
      type: "",
    });
  };

  // Closes the comment modal and resets its temporary state.
  const closeModal = () => {
    setIsModalOpen(false);
    setCommentText("");

    setMessage({
      text: "",
      type: "",
    });
  };

  // Close the modal when the Escape key is pressed.
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  /**
   * Handles comment form submission.
   *
   * The comment is sent to the course-specific API endpoint.
   * Newly submitted comments are created with isApproved: false on the server
   * and therefore do not immediately appear in the public comments list.
   */
  const handleSubmitComment = async (event) => {
    event.preventDefault();

    const trimmedText = commentText.trim();

    // Keep client-side validation aligned with the Comment schema
    // and the course comment API.
    if (trimmedText.length < 10) {
      setMessage({
        text: "Your review must contain at least 10 characters.",
        type: "error",
      });

      return;
    }

    if (trimmedText.length > 2000) {
      setMessage({
        text: "Your review cannot exceed 2000 characters.",
        type: "error",
      });

      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post(`/courses/${course.slug}/comment`, {
        text: trimmedText,
      });

      if (data.success) {
        setCommentText("");

        setMessage({
          text: "Your review was submitted successfully and will be displayed after approval.",
          type: "success",
        });

        // Keep the success message visible briefly before closing the modal.
        setTimeout(() => {
          closeModal();
        }, 4000);
      } else {
        setMessage({
          text: data.message || "Failed to submit your review.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Submitting course comment error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while submitting your review.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Formats the comment creation date for display.
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US");
  };

  /**
   * Keep only top-level comments.
   *
   * Administrator replies are stored as separate Comment documents
   * and reference their parent comment through parentComment.
   */
  const mainComments = comments.filter((comment) => !comment.parentComment);

  /**
   * Creates a map of administrator replies grouped by their parent comment.
   *
   * The API returns parentComment either as an ObjectId string or as a
   * populated object, so both formats are handled safely.
   */
  const replyMap = comments.reduce((map, comment) => {
    if (!comment.parentComment || !comment.isAdminReply) {
      return map;
    }

    const parentId =
      comment.parentComment?._id?.toString() ??
      comment.parentComment?.toString();

    if (!parentId) {
      return map;
    }

    if (!map[parentId]) {
      map[parentId] = [];
    }

    map[parentId].push(comment);

    return map;
  }, {});

  return (
    <section className={styles.comments}>
      {/* Comments section header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>User Reviews ({mainComments.length})</h2>

          <p className={styles.subtitle}>
            See what other users think about this course
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className={styles.addCommentBtn}
        >
          + Write a Review
        </button>
      </div>

      {/* Comments list or empty state */}
      {mainComments.length === 0 ? (
        <div className={styles.empty}>
          <p>No reviews have been submitted for this course yet.</p>

          <span>Be the first to share your experience with this course.</span>
        </div>
      ) : (
        <div className={styles.commentsList}>
          {mainComments.map((comment) => {
            const replies = replyMap[comment._id] || [];

            return (
              <article key={comment._id} className={styles.commentItem}>
                {/* Main comment header */}
                <div className={styles.commentHeader}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      <div className={styles.defaultAvatar}>
                        {comment.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    </div>

                    <div className={styles.userDetails}>
                      <span className={styles.userName}>
                        {comment.user?.name || "Anonymous User"}
                      </span>

                      <span className={styles.date}>
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main comment content */}
                <p className={styles.commentText}>{comment.text}</p>

                {/* Administrator replies */}
                {replies.length > 0 && (
                  <div className={styles.adminReply}>
                    {replies.map((reply) => (
                      <div key={reply._id} className={styles.replyContent}>
                        <div className={styles.replyHeader}>
                          <span className={styles.adminBadge}>Admin Reply</span>

                          <span className={styles.date}>
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>

                        <p className={styles.replyText}>{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Login prompt displayed to unauthenticated users */}
      {!user && (
        <div className={styles.loginPrompt}>
          <p>
            Please{" "}
            <Link href="/auth" className={styles.loginLink}>
              sign in to your account
            </Link>{" "}
            to write a review.
          </p>
        </div>
      )}

      {/* Write comment modal */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className={styles.modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Modal header */}
            <div className={styles.modalHeader}>
              <div>
                <h3>Write a Review</h3>

                <p>{course.title}</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className={styles.modalClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Comment form */}
            <form onSubmit={handleSubmitComment} className={styles.modalForm}>
              <label htmlFor="comment" className={styles.textareaLabel}>
                What do you think about this course?
              </label>

              <textarea
                id="comment"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Share your review, experience, or suggestions about this course..."
                rows="6"
                className={styles.modalTextarea}
                required
                minLength="10"
                maxLength="2000"
                disabled={loading}
              />

              <span className={styles.textareaHint}>
                Please enter between 10 and 2000 characters.
              </span>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.cancelBtn}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.submitBtn}
                >
                  {loading ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>

            {/* Form status message */}
            {message.text && (
              <p className={`${styles.modalMessage} ${styles[message.type]}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
