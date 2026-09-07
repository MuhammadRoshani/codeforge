"use client";

import useAuth from "@/hooks/useAuth";
import useCart from "@/hooks/useCart";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheckCircle } from "react-icons/fa";
import { FaCartShopping } from "react-icons/fa6";

import styles from "./CourseIntro.module.css";

/**
 * Course Intro Component.
 *
 * - Displays the main course introduction, pricing information,
 * enrollment state, and normalized course metadata.
 * - Authentication is managed through the custom useAuth hook,
 * while shopping cart state is managed through Redux Toolkit via useCart.
 * - Only the course data required by the shopping cart is extracted
 * before adding the course to Redux, keeping the cart state lightweight
 * and avoiding unnecessary course data in the global store.
 * - Refreshes the authenticated user's information when the component
 * mounts so the purchasedCourses state always reflects the latest data
 * stored on the server.
 * - Determines whether the authenticated user has already purchased
 * the current course by comparing normalized course IDs.
 * - Supports both ObjectId values and populated course objects inside
 * the user's purchasedCourses array.
 * - When the authenticated user has already purchased the course, the
 * enrollment button is replaced with a confirmation state and a green
 * "Start Learning" button.
 * - The Start Learning button smoothly scrolls the user to the course
 * chapters section instead of navigating to another page.
 */

export default function CourseIntro({
  course,
  totalDuration,
  totalLessons,
  statusText,
  levelText,
  supportText,
  prerequisitesText,
}) {
  // Tracks the loading state of the enrollment or purchase action.
  const [loading, setLoading] = useState(false);

  // Retrieves the authenticated user and the function used to synchronize
  // the client-side user state with the latest server-side user data.
  const { user, refreshUser } = useAuth();

  // Retrieves cart actions and checks whether the current course is already in the Redux cart.
  const { addToCart, isInCart } = useCart();

  /**
   * Refreshes the authenticated user's data whenever the course details
   * component is mounted.
   *
   * AuthProvider normally remains mounted while navigating between pages,
   * so its initial user request is not executed again when the user opens
   * another course page.
   *
   * Refreshing the user here makes sure purchasedCourses contains the
   * latest purchases stored in the database.
   */
  useEffect(() => {
    refreshUser();
  }, []);

  // Determines whether the course is free based on its original price.
  const isFree = !course.price || course.price <= 0;

  /**
   * Normalizes the current course ID so it can be safely compared with
   * MongoDB ObjectId values, strings, or populated course objects.
   */
  const courseId = course._id?.toString();

  /**
   * Checks whether the authenticated user has already purchased the
   * current course.
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

  // Checks whether the course has a valid discounted price.
  const hasDiscount =
    course.discountPrice != null &&
    course.price != null &&
    course.discountPrice < course.price;

  // Uses the discounted price only when a valid discount exists.
  const finalPrice = hasDiscount ? course.discountPrice : course.price || 0;

  // Checks whether the current course is already stored in the Redux cart.
  const isCourseInCart = isInCart(course._id);

  // Adds only the course data required by the cart to the Redux store.
  const addToCartHandler = () => {
    if (!user) {
      return toast.error("Please log in before adding a course to your cart.");
    }

    // Keeps the Redux cart state minimal by storing only the data required
    // to display and calculate the course inside the shopping cart.
    const cartCourse = {
      _id: course._id,
      title: course.title,
      thumbnail: course.thumbnail,
      price: course.price,
      discountPrice: course.discountPrice,
    };

    addToCart(cartCourse);

    toast.success("Course added to your cart.");
  };

  // Smoothly scrolls the user to the course chapters section.
  const handleStartLearning = () => {
    const courseChapters = document.getElementById("course-chapters");

    if (!courseChapters) {
      return;
    }

    courseChapters.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className={styles.courseIntro}>
      {/* Displays the main course information and enrollment controls. */}
      <div className={styles.courseInfo}>
        <h1 className={styles.courseTitle}>{course.title}</h1>

        <p className={styles.courseDesc}>
          {course.shortDescription ||
            "A short description for this course is not available."}
        </p>

        {/* Displays the appropriate enrollment or cart action based on the course state. */}
        <div className={styles.coursePayment}>
          {hasPurchased ? (
            <div className={styles.purchasedBox}>
              <div className={styles.purchasedInfo}>
                <FaCheckCircle size="24px" />

                <span>You are enrolled in this course</span>
              </div>

              <button
                type="button"
                onClick={handleStartLearning}
                className={styles.startLearningBtn}
              >
                Start Learning
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={addToCartHandler}
              disabled={loading || isCourseInCart}
              className={isFree ? styles.freeEnrollBtn : styles.enrollBtn}
            >
              <FaCartShopping size="22px" />

              <span>
                {loading
                  ? "Processing..."
                  : isCourseInCart
                    ? "Added to Cart"
                    : isFree
                      ? "Enroll for Free"
                      : "Enroll in Course"}
              </span>
            </button>
          )}

          {/* Displays the course price when the course is not free or purchased. */}
          {!isFree && !hasPurchased && (
            <div className={styles.priceBox}>
              {hasDiscount && (
                <del className={styles.originalPrice}>
                  {course.price?.toLocaleString()} T
                </del>
              )}

              <p className={styles.finalPrice}>
                <span>{finalPrice.toLocaleString()}</span>
                <span> T</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Displays normalized course metadata. */}
      <div className={styles.courseMeta}>
        <MetaItem label="Course Status" value={statusText} />
        <MetaItem label="Level" value={levelText} />
        <MetaItem label="Duration" value={totalDuration} />
        <MetaItem label="Lessons" value={totalLessons} />
        <MetaItem label="Support" value={supportText} />
        <MetaItem label="Prerequisites" value={prerequisitesText} />
      </div>
    </div>
  );
}

// Displays a single course metadata item with its label and value.
function MetaItem({ label, value }) {
  return (
    <div className={styles.courseDetailBox}>
      <p className={styles.label}>
        <b>{label}</b>
      </p>

      <p className={styles.value}>{value}</p>
    </div>
  );
}
