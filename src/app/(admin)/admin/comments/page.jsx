"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/utils/axios";
import Swal from "sweetalert2";
import Loader from "@/components/shared/Loader";
import Image from "next/image";
import Link from "next/link";

import styles from "./Comments.module.css";

/**
 * Admin Comments Management Page.
 *
 * - Displays all course comments in the admin panel.
 * - Supports server-side searching by comment text, user name, or course title.
 * - Delays search requests by 400 milliseconds to prevent unnecessary requests.
 * - Supports filtering comments by approval status.
 * - Supports server-side pagination for filtered results.
 * - Disables pagination while a search term is active.
 * - Allows administrators to approve or reject comments.
 * - Allows administrators to delete comments.
 * - Allows administrators to reply to user comments.
 * - Allows administrators to edit existing administrator replies.
 */

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Controls whether the comment status dropdown is open.
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const modalRef = useRef(null);
  const filterRef = useRef(null);
  const replyTextareaRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isInitialPaginationRender = useRef(true);

  /**
   * Fetch comments from the admin comments API.
   *
   * Search and status filtering are handled by the server.
   * The API also returns pagination metadata based on the filtered result.
   *
   * The function receives the current values as arguments to prevent
   * stale state values when search, filter, or pagination changes quickly.
   */
  const fetchComments = async (
    currentPage,
    currentSearch,
    currentStatus,
    showLoader = true,
  ) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const params = new URLSearchParams();

      params.set("page", currentPage);

      if (currentSearch.trim()) {
        params.set("search", currentSearch.trim());
      }

      if (currentStatus !== "all") {
        params.set("status", currentStatus);
      }

      const { data } = await api.get(`/admin/comments?${params.toString()}`);

      if (data.success) {
        setComments(data.comments || []);
        setTotalComments(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setMessage({
          text: data.message || "Failed to load comments.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Loading admin comments error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while loading comments.",
        type: "error",
      });
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  /**
   * Fetch the initial comments when the page is mounted.
   *
   * The full-page Loader is used only for the initial request.
   * Search, filtering, and pagination requests keep the page mounted.
   */
  useEffect(() => {
    fetchComments(1, "", "all", true);
  }, []);

  /**
   * Debounce server-side search requests.
   *
   * The request is sent 400ms after the administrator stops typing.
   * Search always starts from the first page.
   */
  useEffect(() => {
    const trimmedSearch = searchTerm.trim();

    setPage(1);

    const timeoutId = setTimeout(() => {
      fetchComments(1, trimmedSearch, filterStatus, false);
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm, filterStatus]);

  /**
   * Fetch comments when pagination changes.
   *
   * Search requests are handled by the debounce effect above.
   * Pagination is therefore used only when there is no active search.
   */
  useEffect(() => {
    if (isInitialPaginationRender.current) {
      isInitialPaginationRender.current = false;
      return;
    }

    if (searchTerm.trim()) {
      return;
    }

    fetchComments(page, "", filterStatus, false);
  }, [page]);

  // Reset pagination when the status filter changes.
  // The search effect above will fetch the filtered results from page one.
  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  // Automatically clear status messages after 4 seconds.
  useEffect(() => {
    if (!message.text) return;

    const timeoutId = setTimeout(() => {
      setMessage({
        text: "",
        type: "",
      });
    }, 4000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [message]);

  // Format comment creation date for display in the admin table.
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US");
  };

  // Open the admin reply modal for a new reply.
  const openReplyModal = (comment) => {
    setReplyingToComment(comment);
    setReplyText("");
    setIsEditMode(false);
    setIsReplyModalOpen(true);

    setMessage({
      text: "",
      type: "",
    });
  };

  // Open the admin reply modal in edit mode with the existing reply text.
  const openEditModal = (comment) => {
    setReplyingToComment(comment);
    setReplyText(comment.text || "");
    setIsEditMode(true);
    setIsReplyModalOpen(true);

    setMessage({
      text: "",
      type: "",
    });
  };

  // Close the admin reply modal.
  const closeReplyModal = () => {
    if (replyLoading) return;

    // Remove focus from any element inside the modal before closing it.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setIsReplyModalOpen(false);
    setReplyingToComment(null);
    setReplyText("");
    setIsEditMode(false);
  };

  // Close the reply modal when the Escape key is pressed.
  // The listener is active only while the modal is open.
  useEffect(() => {
    if (!isReplyModalOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeReplyModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isReplyModalOpen, replyLoading]);

  // Focus the reply textarea after the modal opens.
  // This allows the administrator to start typing immediately.
  useEffect(() => {
    if (!isReplyModalOpen) return;

    const timeoutId = setTimeout(() => {
      replyTextareaRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isReplyModalOpen]);

  // Close the comment status dropdown when the administrator clicks
  // outside the dropdown or presses the Escape key.
  useEffect(() => {
    if (!isFilterOpen) return;

    const handleFilterOutsideClick = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    const handleFilterEscape = (event) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleFilterOutsideClick);
    document.addEventListener("keydown", handleFilterEscape);

    return () => {
      document.removeEventListener("mousedown", handleFilterOutsideClick);
      document.removeEventListener("keydown", handleFilterEscape);
    };
  }, [isFilterOpen]);

  // Submit an administrator reply.
  const handleAdminReply = async () => {
    const trimmedText = replyText.trim();

    if (trimmedText.length < 10) {
      setMessage({
        text: "Reply must contain at least 10 characters.",
        type: "error",
      });

      return;
    }

    if (trimmedText.length > 2000) {
      setMessage({
        text: "Reply cannot exceed 2000 characters.",
        type: "error",
      });

      return;
    }

    try {
      setReplyLoading(true);

      const { data } = await api.post(
        `/admin/comments/${replyingToComment._id}/reply`,
        {
          text: trimmedText,
        },
      );

      if (data.success) {
        await fetchComments(page, searchTerm, filterStatus, false);

        setMessage({
          text: "Reply submitted successfully.",
          type: "success",
        });

        closeReplyModal();
      } else {
        setMessage({
          text: data.message || "Failed to submit reply.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Submitting admin reply error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while submitting the reply.",
        type: "error",
      });
    } finally {
      setReplyLoading(false);
    }
  };

  // Update an existing administrator reply.
  const handleEditReply = async () => {
    const trimmedText = replyText.trim();

    if (trimmedText.length < 10) {
      setMessage({
        text: "Reply must contain at least 10 characters.",
        type: "error",
      });

      return;
    }

    if (trimmedText.length > 2000) {
      setMessage({
        text: "Reply cannot exceed 2000 characters.",
        type: "error",
      });

      return;
    }

    try {
      setReplyLoading(true);

      const { data } = await api.patch(
        `/admin/comments/${replyingToComment._id}/edit`,
        {
          text: trimmedText,
        },
      );

      if (data.success) {
        await fetchComments(page, searchTerm, filterStatus, false);

        setMessage({
          text: "Reply updated successfully.",
          type: "success",
        });

        closeReplyModal();
      } else {
        setMessage({
          text: data.message || "Failed to update reply.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Updating admin reply error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while updating the reply.",
        type: "error",
      });
    } finally {
      setReplyLoading(false);
    }
  };

  // Approve or reject a comment.
  const handleApprove = async (commentId, currentStatus) => {
    const newStatus = !currentStatus;

    try {
      const { data } = await api.patch(`/admin/comments/${commentId}/approve`, {
        isApproved: newStatus,
      });

      if (data.success) {
        // Update the current row immediately so the interface reflects
        // the new status without requiring a full page reload.
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId
              ? {
                  ...comment,
                  isApproved: newStatus,
                }
              : comment,
          ),
        );

        setMessage({
          text: `Comment ${newStatus ? "approved" : "rejected"} successfully.`,
          type: newStatus ? "success" : "error",
        });
      } else {
        setMessage({
          text: data.message || "Failed to update comment status.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Updating comment approval status error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while updating the comment.",
        type: "error",
      });
    }
  };

  // Delete a comment from the admin panel.
  const handleDelete = async (commentId) => {
    const result = await Swal.fire({
      title: "Delete Comment?",
      text: "Are you sure you want to delete this comment?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    if (!result.isConfirmed) return;

    try {
      const { data } = await api.delete(`/admin/comments/${commentId}/delete`);

      if (data.success) {
        setComments((prev) =>
          prev.filter((comment) => comment._id !== commentId),
        );

        setTotalComments((prev) => Math.max(prev - 1, 0));

        setMessage({
          text: "Comment deleted successfully.",
          type: "success",
        });

        // Move to the previous page if the deleted comment was the last row.
        if (comments.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        }
      } else {
        setMessage({
          text: data.message || "Failed to delete comment.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Deleting admin comment error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while deleting the comment.",
        type: "error",
      });
    }
  };

  // Determines whether the administrator currently has an active search term.
  const isSearchActive = searchTerm.trim().length > 0;

  /**
   * Show the full-page Loader only during the initial request.
   *
   * Search, filtering, and pagination requests do not replace the page
   * with the Loader, keeping the interface mounted and responsive.
   */
  if (isLoading) {
    return (
      <div className={styles.container}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Comments Management</h1>
        </div>

        <span className={styles.totalCount}>{totalComments} Comments</span>
      </div>

      {/* Search & Filter Section */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by user, course or comment ..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className={styles.searchInput}
        />

        {/* Comment Status Custom Select */}
        <div ref={filterRef} className={styles.customSelect}>
          <button
            type="button"
            className={`${styles.customSelectButton} ${
              isFilterOpen ? styles.customSelectButtonOpen : ""
            }`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isFilterOpen}
          >
            <span>
              {filterStatus === "all" && "All Comments"}
              {filterStatus === "approved" && "Approved"}
              {filterStatus === "pending" && "Pending"}
            </span>

            <span
              className={`${styles.customSelectArrow} ${
                isFilterOpen ? styles.customSelectArrowOpen : ""
              }`}
              aria-hidden="true"
            >
              ▼
            </span>
          </button>

          {isFilterOpen && (
            <div
              className={styles.customSelectMenu}
              role="listbox"
              aria-label="Comment status"
            >
              <button
                type="button"
                role="option"
                aria-selected={filterStatus === "all"}
                className={`${styles.customSelectOption} ${
                  filterStatus === "all" ? styles.customSelectOptionActive : ""
                }`}
                onClick={() => {
                  setFilterStatus("all");
                  setIsFilterOpen(false);
                }}
              >
                All Comments
              </button>

              <button
                type="button"
                role="option"
                aria-selected={filterStatus === "approved"}
                className={`${styles.customSelectOption} ${
                  filterStatus === "approved"
                    ? styles.customSelectOptionActive
                    : ""
                }`}
                onClick={() => {
                  setFilterStatus("approved");
                  setIsFilterOpen(false);
                }}
              >
                Approved
              </button>

              <button
                type="button"
                role="option"
                aria-selected={filterStatus === "pending"}
                className={`${styles.customSelectOption} ${
                  filterStatus === "pending"
                    ? styles.customSelectOptionActive
                    : ""
                }`}
                onClick={() => {
                  setFilterStatus("pending");
                  setIsFilterOpen(false);
                }}
              >
                Pending
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <p className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </p>
      )}

      {/* Comments Table */}
      {comments.length === 0 ? (
        <p className={styles.empty}>No comments found.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Course</th>
                <th>Comment</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {comments.map((comment) => (
                <tr key={comment._id}>
                  {/* User Column */}
                  <td className={styles.userCell}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        {comment.user?.avatar ? (
                          <Image
                            src={comment.user.avatar}
                            alt={comment.user.name || "User"}
                            width={40}
                            height={40}
                            className={styles.avatarImg}
                          />
                        ) : (
                          <div className={styles.defaultAvatar}>
                            {comment.user?.name?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className={styles.userName}>
                          {comment.user?.name || "Unknown User"}
                        </p>

                        <p className={styles.userPhone}>
                          {comment.user?.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Course Column */}
                  <td>
                    {comment.course?.slug ? (
                      <Link
                        href={`/course/${comment.course.slug}`}
                        className={styles.courseLink}
                      >
                        {comment.course.title?.length > 25
                          ? `${comment.course.title.substring(0, 25)}...`
                          : comment.course.title || "Unknown Course"}
                      </Link>
                    ) : (
                      <span className={styles.deletedCourse}>
                        Course unavailable
                      </span>
                    )}
                  </td>

                  {/* Comment Column */}
                  <td className={styles.commentTextCell}>
                    <p>
                      {comment.text?.length > 80
                        ? `${comment.text.substring(0, 80)}...`
                        : comment.text}
                    </p>

                    {comment.isAdminReply && (
                      <span className={styles.replyLabel}>Admin Reply</span>
                    )}
                  </td>

                  {/* Status Column */}
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        comment.isApproved ? styles.approved : styles.pending
                      }`}
                    >
                      {comment.isApproved ? "Approved" : "Pending"}
                    </span>
                  </td>

                  {/* Date Column */}
                  <td className={styles.dateCell} dir="ltr">
                    {formatDate(comment.createdAt)}
                  </td>

                  {/* Actions Column */}
                  <td className={styles.actionsCell}>
                    <div className={styles.actions}>
                      {!comment.isAdminReply && (
                        <button
                          type="button"
                          onClick={() => openReplyModal(comment)}
                          className={styles.replyBtn}
                        >
                          Reply
                        </button>
                      )}

                      {!comment.isAdminReply && (
                        <button
                          type="button"
                          onClick={() =>
                            handleApprove(comment._id, comment.isApproved)
                          }
                          className={
                            comment.isApproved
                              ? styles.rejectBtn
                              : styles.approveBtn
                          }
                        >
                          {comment.isApproved ? "Reject" : "Approve"}
                        </button>
                      )}

                      {comment.isAdminReply && (
                        <button
                          type="button"
                          onClick={() => openEditModal(comment)}
                          className={styles.editBtn}
                        >
                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(comment._id)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Reply Modal */}
      {isReplyModalOpen && replyingToComment && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReplyModal();
            }
          }}
        >
          <div
            ref={modalRef}
            className={styles.modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <h3>{isEditMode ? "Edit Admin Reply" : "Reply to User"}</h3>

                <p>{replyingToComment.user?.name || "Unknown User"}</p>
              </div>

              <button
                type="button"
                onClick={closeReplyModal}
                className={styles.modalClose}
                aria-label="Close"
                disabled={replyLoading}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Original Comment */}
              {!isEditMode && (
                <div className={styles.originalComment}>
                  <span className={styles.originalCommentLabel}>
                    Original Comment
                  </span>

                  <p>{replyingToComment.text}</p>
                </div>
              )}

              {/* Reply Input */}
              <label htmlFor="admin-reply" className={styles.textareaLabel}>
                Your Reply
              </label>

              <textarea
                id="admin-reply"
                value={replyText}
                ref={replyTextareaRef}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={
                  isEditMode ? "Edit your reply..." : "Write your reply..."
                }
                rows="6"
                maxLength="2000"
                className={styles.modalTextarea}
                disabled={replyLoading}
              />

              <span className={styles.textareaHint}>
                Your reply must contain between 10 and 2000 characters.
              </span>

              {/* Modal Actions */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={closeReplyModal}
                  className={styles.cancelBtn}
                  disabled={replyLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={isEditMode ? handleEditReply : handleAdminReply}
                  disabled={replyLoading}
                  className={styles.submitBtn}
                >
                  {replyLoading
                    ? isEditMode
                      ? "Saving..."
                      : "Submitting..."
                    : isEditMode
                      ? "Save Changes"
                      : "Submit Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            onClick={() => setPage((currentPage) => currentPage - 1)}
            disabled={isSearchActive || page <= 1}
          >
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={isSearchActive || page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
