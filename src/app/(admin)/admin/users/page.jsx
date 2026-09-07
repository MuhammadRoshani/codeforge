"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Loader from "@/components/shared/Loader";

import styles from "./AdminUsers.module.css";

/**
 * Admin Users Management Page.
 *
 * Provides administrators with the ability to:
 * - View registered users.
 * - Search users by name, phone number, or email.
 * - Navigate through users using pagination.
 * - Open an edit modal for a selected user.
 * - Update user information and role.
 * - Close the modal using the close button, Cancel button,
 *   Escape key, or by clicking outside the modal.
 *
 * Search Optimization:
 * - The search input uses a debounce mechanism before sending requests
 *   to the server.
 * - The API request is triggered only after the administrator stops typing
 *   for 400ms.
 *
 * Validation Strategy:
 * - User input is validated on both the client and server sides.
 * - Client-side validation runs before any update request is sent.
 * - Server-side validation remains the final security and data-integrity
 *   layer.
 *
 * Authentication and authorization for this page are handled
 * on the server side through the protected admin API routes.
 */

export default function AdminUsers() {
  // Stores the list of users returned by the admin users API.
  const [users, setUsers] = useState([]);

  // Controls the initial loading state.
  const [isLoading, setIsLoading] = useState(true);

  // Stores the current search query.
  const [search, setSearch] = useState("");

  // Stores the debounced search value.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Controls whether the edit-user modal is visible.
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stores the information of the user currently being edited.
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  // Controls whether the custom role dropdown is open.
  const [isRoleOpen, setIsRoleOpen] = useState(false);

  // Stores the current pagination page.
  const [page, setPage] = useState(1);

  // Stores the total number of users.
  const [totalUsers, setTotalUsers] = useState(0);

  // Number of users displayed on each page.
  const pageSize = 5;

  // Calculate the total number of pages.
  const totalPages = Math.ceil(totalUsers / pageSize);

  // Fetches users from the admin API.
  const fetchUsers = async (searchQuery) => {
    try {
      const { data } = await api.get("/admin/users", {
        params: {
          search: searchQuery,
          page,
        },
      });

      if (data.success) {
        setUsers(data.users);
        setTotalUsers(data.totalUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again later.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Debounces the search input before sending it to the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  // Fetch users when the search value or page changes.
  useEffect(() => {
    fetchUsers(debouncedSearch);
  }, [debouncedSearch, page]);

  // Opens the edit modal for the selected user.
  const openModal = (user) => {
    setEditForm({
      id: user._id,
      name: user.name,
      email: user.email || "",
      phone: user.phone,
      role: user.role,
    });

    setIsRoleOpen(false);
    setIsModalOpen(true);
  };

  // Closes the edit-user modal.
  const closeModal = () => {
    setIsRoleOpen(false);
    setIsModalOpen(false);
  };

  // Close the modal when Escape is pressed.
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };

    if (isModalOpen) {
      window.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isModalOpen]);

  /**
   * Updates the selected user's information after validation.
   */
  const editUserHandler = async (id) => {
    const name = editForm.name.trim();
    const email = editForm.email.trim();

    // Check required fields first.
    if (!name && !email) {
      toast.error("Name and email are required.");
      return;
    }

    // Name validation.
    if (!name) {
      toast.error("Please enter the user's name.");
      return;
    }

    if (name.length < 2) {
      toast.error("Name must contain at least 2 characters.");
      return;
    }

    if (name.length > 35) {
      toast.error("Name cannot be longer than 35 characters.");
      return;
    }

    // Email validation.
    if (!email) {
      toast.error("Please enter the user's email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (email.length > 254) {
      toast.error("Email address is too long.");
      return;
    }

    // Role validation.
    if (!["user", "teacher", "admin"].includes(editForm.role)) {
      toast.error("Invalid user role.");
      return;
    }

    const updatedForm = {
      ...editForm,
      name,
      email,
    };

    try {
      const { data } = await api.patch(`/admin/users/${id}`, updatedForm);

      if (data.success) {
        const updatedUser = data.user;

        toast.success("User information updated successfully.");

        setUsers((users) =>
          users.map((user) =>
            user._id === id ? { ...user, ...updatedUser } : user,
          ),
        );

        closeModal();
      } else {
        toast.error("Failed to save changes.");
      }
    } catch (error) {
      console.error("Something went wrong:", error);

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again later.",
      );
    }
  };

  // Handles clicks on the modal overlay.
  // Clicking outside the actual modal closes it.
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  // Display loading state.
  if (isLoading) {
    return (
      <div className={styles.container}>
        <Loader />
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>User Management</h1>
        </div>

        {/* Search users by name, phone number, or email. */}
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search users by name, phone, email or role..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {users.length === 0 ? (
          <p className={styles.empty}>No user was found.</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    {/* Name */}
                    <td>
                      <div className={styles.tooltipWrapper}>
                        <span className={styles.truncatedText}>
                          {user.name || "-"}
                        </span>

                        {user.name && user.name.length > 14 && (
                          <span className={styles.tooltip}>{user.name}</span>
                        )}
                      </div>
                    </td>

                    {/* Mobile number */}
                    <td>{user.phone}</td>

                    {/* Email */}
                    <td>
                      <div className={styles.tooltipWrapper}>
                        <span className={styles.truncatedText}>
                          {user.email || "-"}
                        </span>

                        {user.email && user.email.length > 19 && (
                          <span className={styles.tooltip}>{user.email}</span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          user.role === "admin"
                            ? styles.published
                            : user.role === "teacher"
                              ? styles.teacher
                              : styles.draft
                        }`}
                      >
                        {user.role === "admin"
                          ? "Admin"
                          : user.role === "teacher"
                            ? "Teacher"
                            : "User"}
                      </span>
                    </td>

                    {/* Is verified */}
                    <td>{user.isVerified ? "Yes" : "No"}</td>

                    {/* Registration Date */}
                    <td>
                      {new Date(user.createdAt).toLocaleDateString("en-US")}
                    </td>

                    {/* Operations */}
                    <td className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => openModal(user)}
                        className={styles.editBtn}
                      >
                        Edit User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit user modal */}
        {isModalOpen && (
          <div className={styles.modalOverlay} onMouseDown={handleOverlayClick}>
            <div
              className={styles.modal}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>Edit User Information</h2>

                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.modalClose}
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* User name */}
                <div className={styles.field}>
                  <label htmlFor="user-name">Name</label>

                  <input
                    id="user-name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* User email */}
                <div className={styles.field}>
                  <label htmlFor="user-email">Email</label>

                  <input
                    id="user-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Phone number is displayed but cannot be changed. */}
                <div className={styles.field}>
                  <label htmlFor="user-phone">Phone Number</label>

                  <input
                    id="user-phone"
                    type="text"
                    disabled
                    value={editForm.phone}
                  />
                </div>

                {/* User role */}
                <div className={styles.field}>
                  <label htmlFor="user-role">Role</label>

                  <div className={styles.customSelect}>
                    <button
                      id="user-role"
                      type="button"
                      className={`${styles.customSelectButton} ${
                        isRoleOpen ? styles.customSelectButtonOpen : ""
                      }`}
                      onClick={() => setIsRoleOpen((prev) => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={isRoleOpen}
                    >
                      <span>
                        {editForm.role === "user" && "User"}
                        {editForm.role === "teacher" && "Teacher"}
                        {editForm.role === "admin" && "Admin"}
                      </span>

                      <span
                        className={`${styles.customSelectArrow} ${
                          isRoleOpen ? styles.customSelectArrowOpen : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▼
                      </span>
                    </button>

                    {isRoleOpen && (
                      <div
                        className={styles.customSelectMenu}
                        role="listbox"
                        aria-label="User role"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={editForm.role === "user"}
                          className={`${styles.customSelectOption} ${
                            editForm.role === "user"
                              ? styles.customSelectOptionActive
                              : ""
                          }`}
                          onClick={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              role: "user",
                            }));

                            setIsRoleOpen(false);
                          }}
                        >
                          User
                        </button>

                        <button
                          type="button"
                          role="option"
                          aria-selected={editForm.role === "teacher"}
                          className={`${styles.customSelectOption} ${
                            editForm.role === "teacher"
                              ? styles.customSelectOptionActive
                              : ""
                          }`}
                          onClick={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              role: "teacher",
                            }));

                            setIsRoleOpen(false);
                          }}
                        >
                          Teacher
                        </button>

                        <button
                          type="button"
                          role="option"
                          aria-selected={editForm.role === "admin"}
                          className={`${styles.customSelectOption} ${
                            editForm.role === "admin"
                              ? styles.customSelectOptionActive
                              : ""
                          }`}
                          onClick={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              role: "admin",
                            }));

                            setIsRoleOpen(false);
                          }}
                        >
                          Admin
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                {/* Cancel without sending changes. */}
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>

                {/* Submit the edited user information. */}
                <button
                  type="button"
                  onClick={() => editUserHandler(editForm.id)}
                  className={styles.submitBtn}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination controls */}
        {/* Show pagination only when users exceed one page */}
        {!search.trim() && totalUsers > pageSize && (
          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => setPage((page) => page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((page) => page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
