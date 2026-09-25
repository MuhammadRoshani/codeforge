"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import api from "@/utils/axios";
import Image from "next/image";
import Link from "next/link";

import styles from "./Courses.module.css";

/**
 * Profile Courses Page.
 *
 * This page displays all courses purchased by the currently authenticated
 * user inside the profile section.
 *
 * The page is responsible for:
 *
 * - Fetching the user's purchased courses from the profile courses API.
 * - Displaying a loading skeleton while the request is in progress.
 * - Displaying an error state when the request fails.
 * - Providing a retry action for failed requests.
 * - Displaying an empty state when the user has no purchased courses.
 * - Displaying each purchased course with its thumbnail, title,
 *    teacher, and short description.
 * - Providing a link to the public course page.
 */

interface CourseTeacher {
  name?: string | null;
}

interface PurchasedCourse {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  teacher?: CourseTeacher | null;
  shortDescription?: string | null;
}

interface ProfileCoursesResponse {
  success: boolean;
  courses?: PurchasedCourse[];
  message?: string;
}

// Fetch the purchased courses when the page is mounted.
export default function Courses() {
  const [courses, setCourses] = useState<PurchasedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  /**
   * Fetch the currently authenticated user's purchased courses.
   *
   * The API identifies the current user from the authentication data,
   * so no user ID needs to be sent from the client.
   */
  const fetchCourses = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError("");

      const { data } =
        await api.get<ProfileCoursesResponse>("/profile/courses");

      /**
       * Axios handles HTTP errors through the catch block.
       * The API success flag is still checked because it represents
       * the application's own response status.
       */
      if (!data.success) {
        setError(
          data.message || "An error occurred while retrieving the courses.",
        );
        return;
      }

      // Store the purchased courses returned by the API.
      setCourses(data.courses || []);
    } catch (error: unknown) {
      // Use the API error message when available.
      // Otherwise, display a generic error message.
      console.error("Error fetching profile courses:", error);

      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined;

      setError(
        typeof errorMessage === "string"
          ? errorMessage
          : "Internal server error.",
      );
    } finally {
      // Stop the loading state after the request is completed.
      setIsLoading(false);
    }
  };

  // Display the loading skeleton while the initial request
  // is being processed.
  if (isLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My courses</h1>

            <p className={styles.subtitle}>The courses you purchased</p>
          </div>
        </div>

        <div className={styles.grid}>
          {[1, 2, 3].map((item) => (
            <div className={styles.skeletonCard} key={item}>
              <div className={styles.skeletonImage}></div>

              <div className={styles.skeletonContent}>
                <div className={styles.skeletonTitle}></div>

                <div className={styles.skeletonText}></div>

                <div className={styles.skeletonButton}></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  /**
   * Display an error state when the API request fails.
   * The retry button allows the user to request the courses again
   * without refreshing the entire page.
   */
  if (error) {
    return (
      <main className={styles.container}>
        <div className={styles.errorBox}>
          <div className={styles.errorIcon}>⚠</div>

          <h2>Retrieving the courses failed.</h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={fetchCourses}
            className={styles.retryButton}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My courses</h1>

          <p className={styles.subtitle}>
            The courses you have purchased are located in this section.
          </p>
        </div>

        {/* Display the total number of purchased courses. */}
        <div className={styles.courseCount}>
          <span>{courses.length}</span>

          <small>Course</small>
        </div>
      </div>

      {/* Empty State */}
      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📖</div>

          <h2>You haven't purchased any courses yet.</h2>

          <p>
            By purchasing the training courses, you can start learning and
            always have access to your courses.
          </p>

          <Link href="/courses" className={styles.browseButton}>
            View Courses
          </Link>
        </div>
      ) : (
        /* Purchased Courses */
        <div className={styles.grid}>
          {courses.map((course) => (
            <article className={styles.courseCard} key={course._id}>
              {/* Course Cover */}
              <div className={styles.coverWrapper}>
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title || "Course thumbnail"}
                    width={500}
                    height={280}
                    className={styles.cover}
                  />
                ) : (
                  <div className={styles.noCover}>
                    <span>📖</span>

                    <p>There is no image for this course.</p>
                  </div>
                )}

                <div className={styles.purchasedBadge}>Purchased ✓</div>
              </div>

              {/* Course Content */}
              <div className={styles.cardContent}>
                <h2 className={styles.courseTitle}>{course.title}</h2>

                {/* Course Teacher */}
                {course.teacher && (
                  <div className={styles.teacher}>
                    <div className={styles.teacherIcon}>👨‍🏫</div>

                    <span>{course.teacher.name || "Unknown Teacher"}</span>
                  </div>
                )}

                {/* Course Short Description */}
                {course.shortDescription && (
                  <p className={styles.description}>
                    {course.shortDescription.length > 100
                      ? `${course.shortDescription.substring(0, 100)}...`
                      : course.shortDescription}
                  </p>
                )}

                {/* Course Link */}
                <div className={styles.cardFooter}>
                  <Link
                    href={`/course/${course.slug}`}
                    className={styles.watchButton}
                  >
                    View course
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
