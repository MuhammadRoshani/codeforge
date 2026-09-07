"use client";

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import { FaLock, FaDownload } from "react-icons/fa";

import styles from "./CourseChapters.module.css";

/**
 * Course Chapters Component.
 *
 * - Displays the complete curriculum of the current course using an
 * accordion-based chapter structure.
 * - Retrieves the authenticated user through the useAuth hook so the
 * component can determine whether the current user has purchased the course.
 * - Purchased users can access all course lessons, while unauthenticated
 * or non-purchased users can only access lessons marked as free.
 * - Locked lessons display a lock icon and a purchase message.
 * - Available lessons provide access to their video URL through a download
 * link.
 * - The component supports opening and closing individual chapters.
 * - The root section contains a stable "course-chapters" ID so other
 * components, such as CourseIntro, can smoothly scroll to the curriculum.
 */

export default function CourseChapters({ course }) {
  // Controls which chapter is currently expanded.
  const [openChapter, setOpenChapter] = useState(0);

  // Retrieves the authenticated user's latest state from AuthContext.
  const { user } = useAuth();

  /**
   * Normalizes the current course ID so it can be safely compared with
   * MongoDB ObjectId values, strings, or populated course objects.
   */
  const courseId = course?._id?.toString();

  /**
   * Checks whether the authenticated user has already purchased
   * the current course.
   *
   * purchasedCourses can contain:
   * - MongoDB ObjectId values
   * - String IDs
   * - Populated course objects containing an _id
   *
   * Converting both sides to strings prevents type differences from
   * causing a purchased course to be treated as unpurchased.
   */
  const hasPurchased =
    !!user &&
    user.purchasedCourses?.some((purchasedCourse) => {
      const purchasedCourseId =
        purchasedCourse?._id?.toString() ?? purchasedCourse?.toString();

      return purchasedCourseId === courseId;
    });

  // Opens the selected chapter or closes it when it is already open.
  const toggleOpenChapter = (chapterIndex) => {
    setOpenChapter(openChapter === chapterIndex ? null : chapterIndex);
  };

  if (!course?.chapters || course.chapters.length === 0) {
    return (
      <section id="course-chapters" className={styles.chapters}>
        <h2 className={styles.title}>Course Curriculum</h2>

        <p className={styles.empty}>
          No chapters have been added to this course yet.
        </p>
      </section>
    );
  }

  return (
    <section id="course-chapters" className={styles.chapters}>
      <div className={styles.header}>
        <h2 className={styles.title}>Course Curriculum</h2>

        <div className={styles.summary}>
          <span>{course.lessonsCount} Lessons</span>
        </div>
      </div>

      <div className={styles.accordion}>
        {course.chapters.map((chapter, chIndex) => {
          const isOpen = openChapter === chIndex;

          return (
            <div
              key={chIndex}
              className={`${styles.chapter} ${isOpen ? styles.open : ""}`}
            >
              <div
                className={styles.chapterHeader}
                onClick={() => toggleOpenChapter(chIndex)}
              >
                <h3>{chapter.title}</h3>

                <span
                  className={`${styles.arrow} ${
                    isOpen ? styles.arrowOpen : ""
                  }`}
                >
                  ▼
                </span>
              </div>

              {!isOpen && (
                <div
                  className={styles.closedChapterMessage}
                  onClick={() => setOpenChapter(chIndex)}
                >
                  Click on a chapter to open the lessons
                </div>
              )}

              <div
                className={`${styles.chapterContentWrapper} ${
                  isOpen ? styles.chapterContentWrapperOpen : ""
                }`}
              >
                <div className={styles.chapterContent}>
                  {chapter.lessons.map((lesson, lesIndex) => {
                    /**
                     * Purchased users can access every lesson.
                     * Other users can only access lessons explicitly
                     * marked as free.
                     */
                    const canAccess = hasPurchased || lesson.isFree;

                    return (
                      <div key={lesIndex} className={styles.lesson}>
                        <div className={styles.lessonInfo}>
                          {canAccess ? (
                            <a
                              href={lesson.videoUrl}
                              download
                              className={styles.lessonLink}
                            >
                              <FaDownload className={styles.downloadIcon} />

                              <span className={styles.lessonTitle}>
                                {lesson.title}
                              </span>
                            </a>
                          ) : (
                            <div className={styles.lockedLesson}>
                              <FaLock className={styles.lockIcon} />

                              <span className={styles.lessonTitle}>
                                {lesson.title}
                              </span>
                            </div>
                          )}
                        </div>

                        {canAccess && (
                          <div className={styles.lessonMeta}>
                            <span>{lesson.duration}</span>
                          </div>
                        )}

                        {!canAccess && (
                          <p className={styles.lockMessage}>
                            Locked — Purchase the course to access this lesson.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
