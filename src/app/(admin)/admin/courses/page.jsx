"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import Loader from "@/components/shared/Loader";
import Link from "next/link";
import Image from "next/image";

import styles from "./Courses.module.css";

/**
 * Course management page for the admin panel.
 *
 * Provides:
 * - Course listing with pagination.
 * - Debounced course search with a 400ms delay.
 * - Search by course title, price, status, and free courses.
 * - Course thumbnail and pricing display.
 * - Navigation to course details and edit pages.
 * - Course deletion with confirmation.
 * - Pagination controls for navigating between course pages.
 * - Loading and error states for API requests.
 */

export default function Courses() {
  // Stores the courses returned from the API.
  const [courses, setCourses] = useState([]);

  // Controls the initial loading state of the page.
  const [isLoading, setIsLoading] = useState(true);

  // Stores API error messages displayed on the page.
  const [message, setMessage] = useState({ text: "", type: "" });

  // Stores the search value entered by the user.
  const [searchTerm, setSearchTerm] = useState("");

  // Stores the debounced search value used for API requests.
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Stores the currently selected pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // Stores the total number of courses matching the current search.
  const [totalCourses, setTotalCourses] = useState(0);

  // The API returns five courses per page.
  const coursesPerPage = 5;

  // Calculates the total number of available pages.
  const totalPages = Math.ceil(totalCourses / coursesPerPage);

  // Delays search requests until the user stops typing for 400ms.
  // This prevents sending an API request for every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Fetches courses whenever the search value or current page changes.
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await api.get("/admin/courses", {
          params: {
            search: debouncedSearchTerm,
            page: currentPage,
          },
        });

        setCourses(data.courses || []);
        setTotalCourses(data.totalCourses || 0);
        setMessage({ text: "", type: "" });
      } catch (error) {
        console.error("Error fetching courses:", error);

        setMessage({
          text: "Failed to load courses.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [debouncedSearchTerm, currentPage]);

  // Updates the search value and returns to the first page
  // because a new search starts a new result set.
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  // Deletes a course after asking the administrator for confirmation.
  const deleteCourseHandler = async (slug) => {
    const result = await Swal.fire({
      title: "Delete Course?",
      text: "This course will be permanently deleted and cannot be recovered.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const { data } = await api.delete(`/admin/courses/${slug}`);

      if (!data.success) {
        toast.error(data.message || "Failed to delete the course.");
        return;
      }

      // Removes the deleted course from the current page
      // without making another GET request.
      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.slug !== slug),
      );

      // Keeps the pagination count synchronized with the deletion.
      setTotalCourses((prevTotal) => prevTotal - 1);

      toast.success("Course deleted successfully.");
    } catch (error) {
      console.error("Error deleting course:", error);

      toast.error(
        error.response?.data?.message ||
          "An error occurred while deleting the course.",
      );
    }
  };

  // Moves to the previous page when the current page is not the first page.
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  // Moves to the next page when the current page is not the last page.
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  // Shows the loader while the initial course data is being fetched.
  if (isLoading) {
    return (
      <div className={styles.container}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page header and course creation action. */}
      <div className={styles.header}>
        <h1 className={styles.title}>Course Management</h1>

        <Link href="/admin/courses/add" className={styles.addButton}>
          + Add New Course
        </Link>
      </div>

      {/* Course search input. */}
      <div className={styles.searchBox}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search courses by title, price or status..."
          className={styles.searchInput}
        />
      </div>

      {/* Displays an API error when loading courses fails. */}
      {message.text && (
        <p className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </p>
      )}

      {/* Displays an empty state when no courses match the search. */}
      {courses.length === 0 ? (
        <p className={styles.empty}>No courses found.</p>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Thumbnail</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Lessons</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {courses.map((course) => (
                  <tr key={course._id}>
                    {/* Displays the course thumbnail or a fallback when no thumbnail exists. */}
                    <td className={styles.thumbnailCell}>
                      {course.thumbnail ? (
                        <div className={styles.thumbnailWrapper}>
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            sizes="80px"
                            className={styles.thumbnailImg}
                          />
                        </div>
                      ) : (
                        <div className={styles.noImage}>No Image</div>
                      )}
                    </td>

                    {/* Displays the course title and shows the full title in a tooltip,
                        when the title exceeds 18 characters. */}
                    <td className={styles.titleCell}>
                      {course.title.length > 18 ? (
                        <div className={styles.tooltipWrapper}>
                          <Link
                            href={`/admin/courses/${course.slug}`}
                            className={styles.courseLink}
                          >
                            {course.title}
                          </Link>

                          <div className={styles.tooltip}>{course.title}</div>
                        </div>
                      ) : (
                        <Link
                          href={`/admin/courses/${course.slug}`}
                          className={styles.courseLink}
                        >
                          {course.title}
                        </Link>
                      )}
                    </td>

                    {/* Displays free, discounted, or regular course pricing. */}
                    <td>
                      {course.isFree ? (
                        <span className={styles.freeBadge}>Free</span>
                      ) : course.discountPrice ? (
                        <>
                          <del>{course.price?.toLocaleString()} T</del>

                          <span className={styles.discountPrice}>
                            {course.discountPrice?.toLocaleString()} T
                          </span>
                        </>
                      ) : (
                        `${course.price?.toLocaleString()} T`
                      )}
                    </td>

                    {/* Displays the total number of lessons in the course. */}
                    <td>{course.lessonsCount || 0}</td>

                    {/* Converts the stored status value into a readable label. */}
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[course.status]
                        }`}
                      >
                        {course.status === "published"
                          ? "Published"
                          : course.status === "draft"
                            ? "Draft"
                            : course.status === "coming-soon"
                              ? "Coming Soon"
                              : course.status}
                      </span>
                    </td>

                    {/* Displays the course creation date using the Gregorian calendar. */}
                    <td dir="ltr">
                      {new Date(course.createdAt).toLocaleDateString("en-US")}
                    </td>

                    {/* Course management actions. */}
                    <td className={styles.actionsCell}>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/courses/${course.slug}/edit`}
                          className={styles.editBtn}
                        >
                          Edit
                        </Link>

                        <button type="button" className={styles.statusBtn}>
                          {course.status === "published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => deleteCourseHandler(course.slug)}
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

          {/* Displays pagination only when more than one page exists. */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>

              <span className={styles.paginationInfo}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
